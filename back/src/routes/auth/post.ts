import bcrypt from 'bcrypt';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';
import { getSetCookieOptions } from '../../config/jwt';
import { requireNotAuth, revokeUserTokens } from '../../middlewares/auth';
import type { LoginRequest, LoginResponse } from '../../models/auth';
import { loginSchema, logoutSchema } from '../../schemas/auth';

/**
 * Rutas POST de autenticación
 */

export const postAuthRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * POST /auth/login - Iniciar sesión
   *
   * config.requiresAuth: false → Evita que el plugin global ejecute requireAuth()
   * preHandler: requireNotAuth → Verifica que NO haya una sesión activa ya
   */
  fastify.post<{ Body: LoginRequest; Reply: LoginResponse }>(
    '/login',
    {
      config: {
        requiresAuth: false, // Deshabilitar autenticación automática del plugin global
      },
      preHandler: requireNotAuth, // Rechazar si ya hay sesión activa
      schema: loginSchema,
    },
    async (request, reply) => {
      const { correo, contrasena } = request.body;

      try {
        // 1. Buscar usuario por correo
        const usuario = await fastify.prisma.usuario.findUnique({
          where: {
            correo: correo.toLowerCase().trim(),
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

        // 2. Verificar que el usuario existe
        if (!usuario) {
          return reply.unauthorized('Credenciales incorrectas');
        }

        // 3. Verificar contraseña
        const isPasswordValid = await bcrypt.compare(
          contrasena,
          usuario.contrasena
        );

        if (!isPasswordValid) {
          return reply.unauthorized('Credenciales incorrectas');
        }

        // 4. Generar JTI único para el token
        const jti = randomUUID();

        // 5. Calcular fecha de expiración (24 horas)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // 6. Guardar token en la base de datos
        await fastify.prisma.token.create({
          data: {
            userId: usuario.id,
            jti: jti,
            issuedAt: new Date(),
            expiresAt: expiresAt,
            active: true,
          },
        });

        // 7. Generar JWT con datos del usuario
        const token = fastify.jwt.sign(
          {
            userId: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            cargoId: usuario.cargoId,
            cargoNombre: usuario.cargo.nombre,
            cargoNivel: usuario.cargo.nivel,
            jti: jti,
          },
          {
            expiresIn: '24h',
          }
        );

        // 8. Establecer cookie con el token
        const cookieOptions = getSetCookieOptions(fastify.config.NODE_ENV);
        reply.setCookie('authToken', token, cookieOptions);

        // 9. Retornar respuesta exitosa
        return reply.send({
          success: true,
          message: 'Login exitoso',
          user: {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            cargo: {
              id: usuario.cargo.id,
              nombre: usuario.cargo.nombre,
              nivel: usuario.cargo.nivel,
            },
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error en login');
        return reply.internalServerError('Error al procesar el login');
      }
    }
  );

  /**
   * POST /auth/logout - Cerrar sesión
   */
  fastify.post(
    '/logout',
    {
      schema: logoutSchema,
    },
    async (request, reply) => {
      try {
        // Verificación de seguridad adicional (no debería ser necesario)
        if (!request.currentUser) {
          return reply.unauthorized('Usuario no autenticado');
        }

        // 1. Revocar todos los tokens activos del usuario
        await revokeUserTokens(
          request,
          request.currentUser.id,
          'Logout manual del usuario'
        );

        // 2. Limpiar cookie
        reply.clearCookie('authToken', {
          path: '/',
        });

        // 3. Retornar respuesta exitosa
        return reply.send({
          success: true,
          message: 'Sesión cerrada exitosamente',
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error en logout');
        return reply.internalServerError('Error al cerrar sesión');
      }
    }
  );
};
