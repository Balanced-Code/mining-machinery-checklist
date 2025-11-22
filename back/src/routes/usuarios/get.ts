import { requireCargoLevel } from '@/middlewares/auth';
import type { UsersDetails } from '@/models/user';
import { getUsuariosSchema } from '@/schemas/usuarios';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const getUsuariosRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * GET /users/ - Obtener listado de usuarios
   * Solo administradores pueden acceder a esta ruta
   */
  fastify.get<{ Reply: { users: UsersDetails[]; total: number } }>(
    '/',
    {
      preHandler: requireCargoLevel(4),
      schema: getUsuariosSchema,
    },
    async (request, reply) => {
      try {
        const result = await fastify.services.usuarios.getAllUsers();
        return reply.send(result);
      } catch (error) {
        fastify.log.error({ error }, 'Error al obtener usuarios');
        return reply.internalServerError('Error al obtener usuarios');
      }
    }
  );
};
