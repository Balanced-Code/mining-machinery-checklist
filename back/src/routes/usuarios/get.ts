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
   * GET /usuarios/cargo/:cargo - Obtener usuarios filtrados por nombre de cargo
   * @param cargo Nombre del cargo (ej: "Inspector", "Supervisor", "Técnico")
   * @returns Lista de usuarios con ese cargo
   */
  fastify.get<{
    Params: { cargo: string };
    Reply: { users: UsersDetails[]; total: number };
  }>(
    '/cargo/:cargo',
    {
      preHandler: requireCargoLevel(3),
      schema: {
        description: 'Obtener usuarios filtrados por nombre de cargo',
        tags: ['Usuarios'],
        params: {
          type: 'object',
          properties: {
            cargo: { type: 'string', description: 'Nombre del cargo' },
          },
          required: ['cargo'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              users: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    nombre: { type: 'string' },
                    correo: { type: 'string' },
                    cargo: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' },
                        nombre: { type: 'string' },
                        nivel: { type: 'number' },
                      },
                    },
                    eliminadoEn: { type: ['string', 'null'] },
                  },
                },
              },
              total: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { cargo } = request.params;
        const result =
          await fastify.services.usuarios.getUsersByCargoNombre(cargo);
        return reply.send(result);
      } catch (error) {
        fastify.log.error({ error }, 'Error al obtener usuarios por cargo');
        return reply.internalServerError('Error al obtener usuarios por cargo');
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
