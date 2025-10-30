import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthenticatedUser, JwtPayload } from '../models/auth';
// Importar extensiones de tipos de Fastify
import '../models/fastify';

/**
 *? Verificar si un token está revocado
 * Consulta la tabla tokens verificando el JTI
 */
async function checkRevokedToken(
  request: FastifyRequest,
  _userId: number
): Promise<boolean> {
  try {
    const payload = request.user as JwtPayload;

    // Buscar el token específico por JTI
    const token = await request.server.prisma.token.findUnique({
      where: {
        jti: payload.jti,
      },
      select: {
        active: true,
        expiresAt: true,
      },
    });

    // Token no existe o está inactivo o expirado
    if (!token || !token.active || token.expiresAt < new Date()) {
      return true;
    }

    return false;
  } catch (error) {
    // Para proyectos pequeños/críticos: bloquear acceso en caso de error BD
    // Priorizar seguridad sobre disponibilidad
    request.log.error('Error verificando token revocado: ' + String(error));
    return true; // Considerar token como revocado por precaución
  }
}

/**
 * Verificar autenticación JWT y validar token
 * Función interna reutilizable que evita duplicación de código
 * Valida que los datos del JWT sigan siendo consistentes con la BD
 */
export async function verifyJWTAndToken(
  request: FastifyRequest
): Promise<AuthenticatedUser | null> {
  try {
    // 1. Verificar JWT desde cookie
    await request.jwtVerify();

    // 2. Extraer payload del JWT (que ya contiene la info básica del usuario)
    const payload = request.user as JwtPayload;

    if (!payload || !payload.userId) {
      return null;
    }

    // 3. Solo verificar que el token no esté revocado
    const isRevoked = await checkRevokedToken(request, payload.userId);
    if (isRevoked) {
      return null;
    }

    // 4. Consultar datos completos del usuario para validar consistencia
    const user = await request.server.prisma.usuario.findUnique({
      where: {
        id: payload.userId,
        eliminadoEn: null, // Solo usuarios activos
      },
      include: {
        cargo: {
          select: {
            id: true,
            nombre: true,
            nivel: true,
          },
        },
      },
    });

    if (!user || !user.cargo) {
      return null; // Usuario no existe o está desactivado
    }

    // 5. Validar que los datos del JWT sigan siendo válidos
    // Si hay cambios críticos, invalidar el token
    if (
      user.correo !== payload.correo ||
      user.nombre !== payload.nombre ||
      user.cargoId !== payload.cargoId
    ) {
      // Token contiene datos obsoletos, forzar re-autenticación
      request.log.warn({
        userId: payload.userId,
        reason: 'JWT datos obsoletos',
        jwtData: {
          correo: payload.correo,
          nombre: payload.nombre,
          cargoId: payload.cargoId,
        },
        dbData: {
          correo: user.correo,
          nombre: user.nombre,
          cargoId: user.cargoId,
        },
      });
      return null;
    }

    // 6. Retornar datos frescos de la BD (garantizados como actuales)
    return {
      id: user.id,
      nombre: user.nombre,
      correo: user.correo,
      cargoId: user.cargoId,
      cargoNombre: user.cargo.nombre,
      cargoNivel: user.cargo.nivel,
    };
  } catch {
    return null;
  }
}

/**
 * PreHandler para endpoints que requieren NO estar autenticado (como login)
 * Versión optimizada con verificación eficiente
 */
export async function requireNotAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const currentUser = await verifyJWTAndToken(request);

    if (currentUser) {
      // Obtener solo el identificador del body del login
      const loginBody = request.body as {
        identifier?: string;
        password?: string;
      };
      const attemptedIdentifier = loginBody?.identifier;

      // Verificar si es el mismo usuario o uno diferente
      const isSameUser =
        attemptedIdentifier &&
        (currentUser.nombre === attemptedIdentifier ||
          currentUser.correo === attemptedIdentifier);

      if (isSameUser) {
        return reply.conflict(
          'Ya tienes una sesión activa. Usa /logout para cerrar sesión primero.'
        );
      } else {
        return reply.conflict(
          'Ya existe una sesión activa con otro usuario. Cierra sesión primero.'
        );
      }
    }
  } catch (error) {
    // Si hay error, permitir continuar (el login normal manejará problemas)
    request.log.error('Error en requireNotAuth: ' + String(error));
  }
}

/**
 * Middleware para verificar cargos específicos por nombre
 * @param allowedCargoNames - Array de nombres de cargos permitidos (ej: ['Administrador', 'Supervisor'])
 */
export function requireCargo(...allowedCargoNames: string[]) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    // Verificar que el usuario esté autenticado
    if (!request.currentUser) {
      return reply.unauthorized('Usuario no autenticado');
    }

    // Verificar que el cargo esté permitido
    if (!allowedCargoNames.includes(request.currentUser.cargoNombre)) {
      return reply.forbidden(
        `Acceso denegado. Cargos permitidos: ${allowedCargoNames.join(', ')}`
      );
    }
  };
}

/**
 * Middleware para verificar nivel mínimo de cargo
 * @param minLevel - Nivel mínimo requerido (1 = Admin, 2 = Supervisor, etc.)
 * Niveles menores = mayor jerarquía
 */
export function requireCargoLevel(minLevel: number) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    // Verificar que el usuario esté autenticado
    if (!request.currentUser) {
      return reply.unauthorized('Usuario no autenticado');
    }

    // Verificar que tenga el nivel de jerarquía requerido o superior
    if (request.currentUser.cargoNivel > minLevel) {
      return reply.forbidden(
        `Acceso denegado. Se requiere nivel de cargo ${minLevel} o superior. Nivel actual: ${request.currentUser.cargoNivel}`
      );
    }
  };
}

/**
 *! Revocar todos los tokens de un usuario
 * Usado en logout o cuando se compromete la seguridad
 */
export async function revokeUserTokens(
  request: FastifyRequest,
  userId: number,
  reason?: string
): Promise<void> {
  await request.server.prisma.token.updateMany({
    where: {
      userId: userId,
      active: true,
    },
    data: {
      active: false,
      revokedAt: new Date(),
      reason: reason || 'Logout del usuario',
    },
  });
}
