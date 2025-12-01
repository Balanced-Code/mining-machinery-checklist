import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { requireCargoLevel } from '@/middlewares/auth';

interface CreateMaquinaBody {
  nombre: string;
}

export const postMaquinasRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * POST /maquinas - Crear nueva máquina
   * Requiere nivel 3+ (Inspector o Administrador)
   */
  fastify.post<{ Body: CreateMaquinaBody }>(
    '/',
    {
      preHandler: requireCargoLevel(3),
      schema: {
        description: 'Crear una nueva máquina',
        tags: ['maquinas'],
        body: {
          type: 'object',
          required: ['nombre'],
          properties: {
            nombre: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
              },
              message: {
                type: 'string',
              },
              maquina: {
                type: 'object',
                properties: {
                  id: {
                    type: 'number',
                  },
                  nombre: {
                    type: 'string',
                  },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          409: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { nombre } = request.body;
        const userId = request.currentUser!.id;

        // Verificar si ya existe una máquina con ese nombre
        const maquinaExistente =
          await fastify.services.maquinas.getMaquinaByNombre(nombre);

        if (maquinaExistente) {
          return reply.code(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: 'Ya existe una máquina con ese nombre',
          });
        }

        // Crear la máquina
        const maquina = await fastify.services.maquinas.createMaquina(
          nombre,
          userId
        );

        return reply.code(201).send({
          success: true,
          message: 'Máquina creada exitosamente',
          maquina: {
            id: maquina.id,
            nombre: maquina.nombre,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error al crear máquina');
        return reply.internalServerError('Error al crear la máquina');
      }
    }
  );
};
