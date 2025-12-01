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
};
