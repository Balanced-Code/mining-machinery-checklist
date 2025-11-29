import type { FastifyPluginAsync, FastifyInstance } from 'fastify';
import { requireCargoLevel } from '@/middlewares/auth';
import {
  deleteSeccionSchema,
  deleteTemplateSchema,
} from '@/schemas/checklists_template';

export const deleteTemplatesRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * DELETE /templates/:id - Eliminar template (hard o soft según uso)
   */
  fastify.delete<{ Params: { id: number } }>(
    '/:id',
    { preHandler: requireCargoLevel(3), schema: deleteTemplateSchema },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const template = await fastify.services.templates.getTemplateById(id);

        if (!template) {
          return reply.notFound('Template no encontrado');
        }

        await fastify.services.templates.deleteTemplate(
          id,
          request.currentUser!.id
        );

        return reply.send({
          success: true,
          message: 'Template eliminado exitosamente',
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error al eliminar template:');
        return reply.internalServerError('Error al eliminar template');
      }
    }
  );

  /**
   * DELETE /templates/seccion/:id - Eliminar sección (hard o soft según uso)
   */
  fastify.delete<{ Params: { id: number } }>(
    '/seccion/:id',
    { preHandler: requireCargoLevel(3), schema: deleteSeccionSchema },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const seccion = await fastify.services.templates.getSeccionById(id);

        if (!seccion) {
          return reply.notFound('Sección no encontrada');
        }

        await fastify.services.templates.deleteSeccion(
          id,
          request.currentUser!.id
        );

        return reply.send({
          success: true,
          message: 'Sección eliminada exitosamente',
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error al eliminar sección:');
        return reply.internalServerError('Error al eliminar sección');
      }
    }
  );
};
