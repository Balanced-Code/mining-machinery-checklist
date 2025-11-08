import bcrypt from 'bcrypt';
import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import { revokeUserTokens } from '../../middlewares/auth';
import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
} from '../../models/auth';
import { changePasswordSchema } from '../../schemas/auth';

/**
 * Rutas PUT de autenticación
 */

export const putAuthRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * PUT /auth/profile/password - Cambiar contraseña del usuario autenticado
   */
  fastify.put<{
    Body: ChangePasswordRequest; // Lo que recibo del frontend
    Reply: ChangePasswordResponse; // Lo que devuelvo al frontend
  }>(
    '/profile/password',
    {
      schema: changePasswordSchema, // Validación automática + documentación Swagger
    },
    async (request, reply) => {
      try {
        // 1. Verificar que el usuario esté autenticado
        if (!request.currentUser) {
          return reply.unauthorized('Usuario no autenticado');
        }

        // 2. Extraer datos del body (ya validados por el schema)
        const { currentPassword, newPassword, confirmPassword } = request.body;

        // 3. Validar que las contraseñas nuevas coincidan
        if (newPassword !== confirmPassword) {
          return reply.badRequest('Las contraseñas nuevas no coinciden');
        }

        // 4. Validar que la nueva contraseña sea diferente a la actual
        if (currentPassword === newPassword) {
          return reply.badRequest(
            'La nueva contraseña debe ser diferente a la actual'
          );
        }

        // 5. Obtener usuario de la BD con contraseña hasheada
        const usuario = await fastify.prisma.usuario.findUnique({
          where: {
            id: request.currentUser.id,
            eliminadoEn: null,
          },
          select: {
            id: true,
            contrasena: true,
          },
        });

        if (!usuario) {
          return reply.notFound('Usuario no encontrado');
        }

        // 6. Verificar que la contraseña actual sea correcta
        const isCurrentPasswordValid = await bcrypt.compare(
          currentPassword,
          usuario.contrasena
        );

        if (!isCurrentPasswordValid) {
          return reply.unauthorized('La contraseña actual es incorrecta');
        }

        // 7. Hashear la nueva contraseña
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // 8. Actualizar contraseña en la BD
        await fastify.prisma.usuario.update({
          where: {
            id: usuario.id,
          },
          data: {
            contrasena: hashedNewPassword,
          },
        });

        // 9. Revocar todos los tokens existentes (forzar re-login)
        // Esto es una buena práctica de seguridad
        await revokeUserTokens(
          request,
          usuario.id,
          'Contraseña cambiada - forzar re-autenticación'
        );

        // 10. Limpiar cookie actual
        reply.clearCookie('authToken', {
          path: '/',
        });

        // 11. Retornar respuesta exitosa
        return reply.send({
          success: true,
          message:
            'Contraseña cambiada exitosamente. Por favor, inicia sesión nuevamente.',
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error al cambiar contraseña');
        return reply.internalServerError('Error al cambiar la contraseña');
      }
    }
  );
};
