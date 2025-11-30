import { requireCargoLevel } from '@/middlewares/auth';
import type { CargosDetails, UsersDetails } from '@/models/user';
import {
  getCargosSchema,
  getUsuarioByIdSchema,
  getUsuariosSchema,
} from '@/schemas/usuarios';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const getUsuariosRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * GET /usuarios - Obtener listado de usuarios
   * Solo administradores pueden acceder a esta ruta
   * @returns Lista de usuarios con información de cargo
   */
  fastify.get<{ Reply: { users: UsersDetails[]; total: number } }>(
    '/',
    {
      preHandler: requireCargoLevel(3),
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

  /**
   * GET /usuarios/cargos - Obtener listado de cargos
   * Solo administradores pueden acceder a esta ruta
   * @returns Lista de cargos
   */
  fastify.get<{ Reply: CargosDetails[] }>(
    '/cargos',
    {
      schema: getCargosSchema,
    },
    async (request, reply) => {
      try {
        const result = await fastify.services.usuarios.getAllCargos();
        return reply.send(result);
      } catch (error) {
        fastify.log.error({ error }, 'Error al obtener cargos');
        return reply.internalServerError('Error al obtener cargos');
      }
    }
  );

  /**
   * GET /usuarios/:id - Obtener usuario por ID
   * Solo administradores pueden acceder a esta ruta
   * @param id ID del usuario
   * @returns Usuario encontrado
   */
  fastify.get<{ Params: { id: number }; Reply: UsersDetails }>(
    '/:id',
    {
      preHandler: requireCargoLevel(4),
      schema: getUsuarioByIdSchema,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await fastify.services.usuarios.getUsuarioById(id);

        if (!result) {
          return reply.notFound('Usuario no encontrado');
        }

        return reply.send(result);
      } catch (error) {
        fastify.log.error({ error }, 'Error al obtener usuario');
        return reply.internalServerError('Error al obtener usuario');
      }
    }
  );
};
