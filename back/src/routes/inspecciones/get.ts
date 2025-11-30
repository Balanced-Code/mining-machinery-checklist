import {
  getInspeccionesSchema,
  getInspeccionByIdSchema,
} from '@/schemas/inspecciones';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const getInspeccionesRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * GET /inspecciones
   * Listar todas las inspecciones
   * Acceso: Automático (cualquier usuario autenticado)
   */
  fastify.get(
    '/',
    { schema: getInspeccionesSchema },
    async (request, reply) => {
      try {
        const inspecciones =
          await fastify.services.inspecciones.getAllInspecciones();

        // Serializar BigInt a string para JSON
        const inspeccionesSerializadas = inspecciones.map(insp => ({
          ...insp,
          id: insp.id.toString(),
        }));

        return reply.send({
          inspecciones: inspeccionesSerializadas,
          total: inspeccionesSerializadas.length,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error al obtener inspecciones:');
        return reply.internalServerError('Error al obtener inspecciones');
      }
    }
  );

  /**
   * GET /inspecciones/:id
   * Obtener una inspección específica
   * Acceso: Automático (cualquier usuario autenticado)
   */
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { schema: getInspeccionByIdSchema },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const inspeccionId = BigInt(id);

        const inspeccion =
          await fastify.services.inspecciones.getInspeccionById(inspeccionId);

        if (!inspeccion) {
          return reply.notFound('Inspección no encontrada');
        }

        // Serializar BigInt a string
        const inspeccionSerializada = {
          ...inspeccion,
          id: inspeccion.id.toString(),
        };

        return reply.send(inspeccionSerializada);
      } catch (error) {
        fastify.log.error({ error }, 'Error al obtener inspección:');
        return reply.internalServerError('Error al obtener la inspección');
      }
    }
  );
};
