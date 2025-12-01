import { requireCargoLevel } from '@/middlewares/auth';
import { deleteInspeccionSchema } from '@/schemas/inspecciones';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const deleteInspeccionesRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * DELETE /inspecciones/:id
   * Eliminar una inspección (soft delete)
   * Acceso:
   * - Nivel 3 (inspectores): Solo inspecciones NO finalizadas
   * - Nivel 4 (administradores): Todas las inspecciones
   */
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireCargoLevel(3), schema: deleteInspeccionSchema },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const inspeccionId = BigInt(id);
        const currentUser = request.currentUser!;

        // Verificar que la inspección existe
        const inspeccion =
          await fastify.services.inspecciones.getInspeccionById(inspeccionId);

        if (!inspeccion) {
          return reply.notFound('Inspección no encontrada');
        }

        // Verificar permisos según el nivel del usuario
        const userCargo = await fastify.prisma.cargo.findUnique({
          where: { id: currentUser.cargoId },
        });

        if (!userCargo) {
          return reply.forbidden('No se pudo verificar el nivel de permisos');
        }

        // Si la inspección está finalizada y el usuario NO es nivel 4 (admin)
        if (inspeccion.fechaFinalizacion && userCargo.nivel < 4) {
          return reply.forbidden(
            'Solo los administradores pueden eliminar inspecciones finalizadas'
          );
        }

        // Soft delete
        await fastify.services.inspecciones.deleteInspeccion(
          inspeccionId,
          currentUser.id
        );

        return reply.send({
          success: true,
          message: 'Inspección eliminada exitosamente',
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error al eliminar inspección:');
        return reply.internalServerError('Error al eliminar la inspección');
      }
    }
  );

  /**
   * DELETE /inspecciones/:id/templates/:templateId
   * Eliminar un template de una inspección
   * Requiere nivel 3+
   */
  fastify.delete<{ Params: { id: string; templateId: string } }>(
    '/:id/templates/:templateId',
    { preHandler: requireCargoLevel(3) },
    async (request, reply) => {
      try {
        const { id, templateId } = request.params;
        const inspeccionId = BigInt(id);
        const currentUser = request.currentUser!;

        await fastify.services.inspecciones.eliminarTemplate(
          inspeccionId,
          Number(templateId),
          currentUser.id
        );

        return reply.send({
          success: true,
          message: 'Checklist eliminado exitosamente',
        });
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message.includes('no encontrada') ||
            error.message.includes('no encontrado') ||
            error.message.includes('finalizada')
          ) {
            request.log.warn(`Error al eliminar template: ${error.message}`);
            return reply.code(400).send({
              statusCode: 400,
              error: 'Bad Request',
              message: error.message,
            });
          }
        }

        fastify.log.error({ error }, 'Error al eliminar template:');
        return reply.internalServerError('Error al eliminar el checklist');
      }
    }
  );

  /**
   * DELETE /inspecciones/:id/asignaciones/:usuarioId
   * Eliminar una asignación de usuario de una inspección
   * Requiere nivel 3+
   */
  fastify.delete<{ Params: { id: string; usuarioId: string } }>(
    '/:id/asignaciones/:usuarioId',
    { preHandler: requireCargoLevel(3) },
    async (request, reply) => {
      try {
        const { id, usuarioId } = request.params;
        const inspeccionId = BigInt(id);
        const currentUser = request.currentUser!;

        await fastify.services.inspecciones.eliminarAsignacion(
          inspeccionId,
          Number(usuarioId),
          currentUser.id
        );

        return reply.send({
          success: true,
          message: 'Asignación eliminada exitosamente',
        });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('no encontrad')) {
            request.log.warn(`Error al eliminar asignación: ${error.message}`);
            return reply.code(404).send({
              statusCode: 404,
              error: 'Not Found',
              message: error.message,
            });
          }
        }

        fastify.log.error({ error }, 'Error al eliminar asignación:');
        return reply.internalServerError('Error al eliminar la asignación');
      }
    }
  );
};
