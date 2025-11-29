import { requireCargoLevel } from '@/middlewares/auth';
import type { UpdateSeccionData } from '@/models/template';
import {
  updateTemplateSchema,
  updateSeccionSchema,
} from '@/schemas/checklists_template';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const patchTemplatesRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * PATCH /templates/:id
   * Solo inspectores o administradores pueden acceder a esta ruta
   * @returns Nombre del Template actualizado
   */
  fastify.patch<{ Params: { id: number }; Body: { nombre: string } }>(
    '/:id',
    { preHandler: requireCargoLevel(3), schema: updateTemplateSchema },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { nombre } = request.body;

        const template = await fastify.services.templates.getTemplateById(id);

        if (!template) {
          return reply.notFound('El template no existe');
        }

        const updatedTemplate = await fastify.services.templates.updateTemplate(
          request.currentUser!.id,
          id,
          nombre
        );

        return reply.send({
          success: true,
          message: 'Template actualizado exitosamente',
          template: {
            id: updatedTemplate.id,
            nombre: updatedTemplate.nombre,
          },
        });
      } catch (error) {
        // Error de inmutabilidad
        if (error instanceof Error && error.message.includes('siendo usado')) {
          return reply.conflict(error.message);
        }
        fastify.log.error({ error }, 'Error al actualizar el template:');
        return reply.internalServerError('Error al actualizar el template');
      }
    }
  );

  /**
   * PATCH /templates/seccion/:id
   * Solo inspectores o administradores pueden acceder a esta ruta
   * @returns Nombre de la sección del template actualizada
   */
  fastify.patch<{
    Params: { id: number };
    Body: UpdateSeccionData;
  }>(
    '/seccion/:id',
    { preHandler: requireCargoLevel(3), schema: updateSeccionSchema },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { nombre, orden } = request.body;
        const updateData: UpdateSeccionData = {};

        const seccion = await fastify.services.templates.getSeccionById(id);

        if (!seccion) {
          return reply.notFound('La seccion no existe');
        }

        if (nombre) updateData.nombre = nombre;
        if (orden) updateData.orden = orden;

        const updatedTemplate = await fastify.services.templates.updateSeccion(
          request.currentUser!.id,
          id,
          updateData
        );

        return reply.send({
          success: true,
          message: 'Seccion actualizada exitosamente',
          seccion: {
            id: updatedTemplate.id,
            nombre: updatedTemplate.nombre,
            templateId: updatedTemplate.templateId,
            orden: updatedTemplate.orden,
          },
        });
      } catch (error) {
        // Error de inmutabilidad o orden duplicado
        if (error instanceof Error) {
          if (
            error.message.includes('siendo usada') ||
            error.message.includes('orden')
          ) {
            return reply.conflict(error.message);
          }
        }
        fastify.log.error({ error }, 'Error al actualizar la seccion:');
        return reply.internalServerError('Error al actualizar la seccion');
      }
    }
  );
};
