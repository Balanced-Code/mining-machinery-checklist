import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UserRole } from '../generated/prisma/index';
import { UserService } from '../services/userService';

// Definir tipos para el usuario autenticado
export interface AuthenticatedUser {
  id: number;
  username: string;
  email: string;
  rol: UserRole;
}

// Extender FastifyRequest para incluir información del usuario autenticado
declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: AuthenticatedUser;
  }
}

/**
 *? Verificar si un token está revocado
 * Consulta la tabla revoked_tokens
 */
async function checkRevokedToken(
  request: FastifyRequest,
  userId: number
): Promise<boolean> {
  try {
    // Buscar si existe algún token revocado para este usuario
    // que sea posterior a la emisión del token actual
    const payload = request.user as { userId: number; iat: number };
    const tokenIssuedAt = new Date(payload.iat * 1000); // iat está en segundos

    const revokedToken = await request.server.prisma.revokedToken.findFirst({
      where: {
        userId: userId,
        revokedAt: {
          gte: tokenIssuedAt, // Token revocado después de la emisión
        },
      },
    });

    return !!revokedToken; // Retorna true si existe un token revocado
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
    const payload = request.user as {
      userId: number;
      username: string;
      email: string;
      rol: UserRole;
      iat: number;
    };

    if (!payload || !payload.userId) {
      return null;
    }

    // 3. Solo verificar que el token no esté revocado
    const isRevoked = await checkRevokedToken(request, payload.userId);
    if (isRevoked) {
      return null;
    }

    // 4. Consultar datos completos del usuario para validar consistencia
    const userService = new UserService(request.server.prisma);
    const user = await userService.getUserByIdPublic(payload.userId);

    if (!user) {
      return null; // Usuario no existe o está desactivado
    }

    // 5. Validar que los datos del JWT sigan siendo válidos
    // Si hay cambios críticos, invalidar el token
    if (
      user.email !== payload.email ||
      user.username !== payload.username ||
      user.rol !== payload.rol
    ) {
      // Token contiene datos obsoletos, forzar re-autenticación
      request.log.warn({
        userId: payload.userId,
        reason: 'JWT datos obsoletos',
        jwtData: {
          email: payload.email,
          username: payload.username,
          rol: payload.rol,
        },
        dbData: { email: user.email, username: user.username, rol: user.rol },
      });
      return null;
    }

    // 6. Retornar datos frescos de la BD (garantizados como actuales)
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      rol: user.rol,
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
        (currentUser.username === attemptedIdentifier ||
          currentUser.email === attemptedIdentifier);

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
 * Middleware para verificar roles específicos
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    // Verificar que el usuario esté autenticado
    if (!request.currentUser) {
      return reply.unauthorized('Usuario no autenticado');
    }

    // Verificar que el rol esté permitido
    if (!allowedRoles.includes(request.currentUser.rol)) {
      return reply.forbidden(
        `Acceso denegado. Roles permitidos: ${allowedRoles.join(', ')}`
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
  await request.server.prisma.revokedToken.create({
    data: {
      userId: userId,
      revokedAt: new Date(),
      reason: reason || 'Logout del usuario',
    },
  });
}
