import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { requireCargoLevel } from '@/middlewares/auth';

interface UpdateMaquinaParams {
  id: string;
}

interface UpdateMaquinaBody {
  nombre: string;
}

export const putMaquinasRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * PUT /maquinas/:id - Actualizar máquina existente
   * Requiere nivel 3+ (Inspector o Administrador)
   * No se puede actualizar si está en uso
   */
  fastify.put<{ Params: UpdateMaquinaParams; Body: UpdateMaquinaBody }>(
    '/:id',
    {
      preHandler: requireCargoLevel(3),
      schema: {
        description: 'Actualizar una máquina existente',
        tags: ['maquinas'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              pattern: '^[0-9]+$',
            },
          },
        },
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
          200: {
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
          404: {
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
        const { id } = request.params;
        const { nombre } = request.body;
        const userId = request.currentUser!.id;

        const maquinaId = parseInt(id, 10);

        // Verificar que la máquina exista
        const maquinaExistente =
          await fastify.services.maquinas.getMaquinaById(maquinaId);

        if (!maquinaExistente) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Máquina no encontrada',
          });
        }

        // Verificar si está en uso
        const enUso =
          await fastify.services.maquinas.checkMaquinaInUse(maquinaId);

        if (enUso) {
          return reply.code(409).send({
            statusCode: 409,
            error: 'Conflict',
            message:
              'No se puede modificar una máquina que está siendo usada en inspecciones',
          });
        }

        // Verificar si ya existe otra máquina con ese nombre
        const maquinaConMismoNombre =
          await fastify.services.maquinas.getMaquinaByNombre(nombre);

        if (maquinaConMismoNombre && maquinaConMismoNombre.id !== maquinaId) {
          return reply.code(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: 'Ya existe otra máquina con ese nombre',
          });
        }

        // Actualizar la máquina
        const maquina = await fastify.services.maquinas.updateMaquina(
          maquinaId,
          nombre,
          userId
        );

        return reply.code(200).send({
          success: true,
          message: 'Máquina actualizada exitosamente',
          maquina,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error al actualizar máquina');
        return reply.internalServerError('Error al actualizar máquina');
      }
    }
  );
};
