import { requireCargoLevel } from '@/middlewares/auth';
import { deleteInspeccionSchema } from '@/schemas/inspecciones';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const deleteInspeccionesRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * DELETE /inspecciones/:id
   * Eliminar una inspección (soft delete)
   * Acceso: Solo nivel 3+ (inspectores y admin)
   */
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireCargoLevel(3), schema: deleteInspeccionSchema },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const inspeccionId = BigInt(id);

        // Verificar que la inspección existe
        const inspeccion =
          await fastify.services.inspecciones.getInspeccionById(inspeccionId);

        if (!inspeccion) {
          return reply.notFound('Inspección no encontrada');
        }

        // Soft delete
        await fastify.services.inspecciones.deleteInspeccion(
          inspeccionId,
          request.currentUser!.id
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
};
