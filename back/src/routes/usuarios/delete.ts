import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { deleteUsuarioSchema } from '@/schemas/usuarios';
import { requireCargoLevel } from '@/middlewares/auth';

/**
 * Rutas DELETE de usuarios
 */
export const deleteUsersRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * DELETE /users/:id - Eliminar usuario (soft delete)
   */
  fastify.delete<{
    Params: { id: number };
  }>(
    '/:id',
    { preHandler: requireCargoLevel(4), schema: deleteUsuarioSchema },
    async (request, reply) => {
      try {
        const { id } = request.params;

        // Verificar que el usuario existe y no está eliminado
        const usuario = await fastify.services.usuarios.getDeleteUsuario(id);

        if (!usuario) {
          return reply.notFound('Usuario no encontrado o eliminado');
        }

        // Evitar auto-eliminación
        if (request.currentUser?.id === id) {
          return reply.badRequest('No puedes eliminar tu propio usuario');
        }

        // Soft delete
        await fastify.services.usuarios.deleteUsuario(id);

        return reply.send({
          success: true,
          message: 'Usuario eliminado exitosamente',
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error al eliminar usuario:');
        return reply.internalServerError('Error al eliminar usuario');
      }
    }
  );
};
