import { requireCargoLevel } from '@/middlewares/auth';
import { deleteInspeccionSchema } from '@/schemas/inspecciones';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const deleteInspeccionesRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * DELETE /inspecciones/:id
   * Eliminar una inspección
   * Lógica:
   * - Si está finalizada: soft delete (requiere nivel 3+)
   * - Si NO está finalizada: hard delete (requiere nivel 3+)
   */
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireCargoLevel(3), schema: deleteInspeccionSchema },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const inspeccionId = BigInt(id);
        const currentUser = request.currentUser!;

        const resultado = await fastify.services.inspecciones.deleteInspeccion(
          inspeccionId,
          currentUser.id
        );

        return reply.send({
          success: true,
          message: resultado.isHardDelete
            ? 'Inspección eliminada permanentemente'
            : 'Inspección eliminada (puede ser reactivada por un administrador)',
          isHardDelete: resultado.isHardDelete,
        });
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message.includes('no encontrada') ||
            error.message.includes('ya está eliminada')
          ) {
            request.log.warn(`Error al eliminar inspección: ${error.message}`);
            return reply.code(404).send({
              statusCode: 404,
              error: 'Not Found',
              message: error.message,
            });
          }
        }

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

        request.log.info(
          {
            inspeccionId: id,
            usuarioId,
            currentUserId: currentUser.id,
          },
          'DELETE /inspecciones/:id/asignaciones/:usuarioId - Eliminar asignación'
        );

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

  /**
   * POST /inspecciones/:id/reactivar
   * Reactivar una inspección eliminada (soft delete)
   * Solo administradores (nivel 4)
   */
  fastify.post<{ Params: { id: string } }>(
    '/:id/reactivar',
    { preHandler: requireCargoLevel(4) },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const inspeccionId = BigInt(id);
        const currentUser = request.currentUser!;

        const inspeccion =
          await fastify.services.inspecciones.reactivarInspeccion(
            inspeccionId,
            currentUser.id
          );

        return reply.send({
          success: true,
          message: 'Inspección reactivada exitosamente',
          inspeccion: {
            id: inspeccion.id.toString(),
            fechaInicio: inspeccion.fechaInicio.toISOString(),
            fechaFinalizacion:
              inspeccion.fechaFinalizacion?.toISOString() ?? null,
            maquinaId: inspeccion.maquinaId,
            numSerie: inspeccion.numSerie,
            nSerieMotor: inspeccion.nSerieMotor,
            cabinado: inspeccion.cabinado,
            horometro: inspeccion.horometro
              ? Number(inspeccion.horometro)
              : null,
            creadoPor: inspeccion.creadoPor,
            maquina: inspeccion.maquina,
            creador: inspeccion.creador,
          },
        });
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message.includes('no encontrada') ||
            error.message.includes('no está eliminada')
          ) {
            request.log.warn(`Error al reactivar inspección: ${error.message}`);
            return reply.code(404).send({
              statusCode: 404,
              error: 'Not Found',
              message: error.message,
            });
          }
        }

        fastify.log.error({ error }, 'Error al reactivar inspección:');
        return reply.internalServerError('Error al reactivar la inspección');
      }
    }
  );
};
