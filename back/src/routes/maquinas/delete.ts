import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { requireCargoLevel } from '@/middlewares/auth';

interface DeleteMaquinaParams {
  id: string;
}

export const deleteMaquinasRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * DELETE /maquinas/:id - Eliminar máquina (soft delete)
   * Requiere nivel 3+ (Inspector o Administrador)
   * No se puede eliminar si está en uso
   */
  fastify.delete<{ Params: DeleteMaquinaParams }>(
    '/:id',
    {
      preHandler: requireCargoLevel(3),
      schema: {
        description: 'Eliminar una máquina (soft delete)',
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
              'No se puede eliminar una máquina que está siendo usada en inspecciones',
          });
        }

        // Eliminar la máquina (soft delete)
        await fastify.services.maquinas.deleteMaquina(maquinaId);

        return reply.code(200).send({
          success: true,
          message: 'Máquina eliminada exitosamente',
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error al eliminar máquina');
        return reply.internalServerError('Error al eliminar máquina');
      }
    }
  );
};
