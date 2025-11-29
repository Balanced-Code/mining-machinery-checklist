import { requireCargoLevel } from '@/middlewares/auth';
import {
  createSeccionSchema,
  createTemplateSchema,
} from '@/schemas/checklists_template';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const postTemplatesRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * POST /templates/create - Crea un nuevo template
   * Solo inspectores o administradores pueden acceder a esta ruta
   * @returns Template creado
   */
  fastify.post<{ Body: { nombre: string } }>(
    '/create',
    { preHandler: requireCargoLevel(3), schema: createTemplateSchema },
    async (request, reply) => {
      try {
        const { nombre } = request.body;

        const template = await fastify.services.templates.createTemplate(
          request.currentUser!.id,
          nombre
        );

        return reply.send({
          success: true,
          message: 'Template creado exitosamente',
          template,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error al crear el template:');
        return reply.internalServerError('Error al crear el template');
      }
    }
  );

  /**
   * POST /templates/seccion/create - Crea una nueva seccion
   * Solo inspectores o administradores pueden acceder a esta ruta
   * @returns Seccion creada
   */
  fastify.post<{
    Body: { template_id: number; nombre: string; orden: number };
  }>(
    '/seccion/create',
    { preHandler: requireCargoLevel(3), schema: createSeccionSchema },
    async (request, reply) => {
      try {
        const { template_id, nombre, orden } = request.body;

        const seccion = await fastify.services.templates.createSeccion(
          request.currentUser!.id,
          template_id,
          nombre,
          orden
        );

        return reply.send({
          success: true,
          message: 'seccion creado exitosamente',
          seccion,
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('orden')) {
          return reply.conflict(error.message);
        }
        fastify.log.error({ error }, 'Error al crear la seccion:');
        return reply.internalServerError('Error al crear la seccion');
      }
    }
  );
};
