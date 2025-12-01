import {
  getInspeccionesSchema,
  getInspeccionByIdSchema,
  getChecklistsSchema,
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

        // Serializar manualmente para preservar todas las propiedades
        const inspeccionesSerializadas = inspecciones.map(insp => ({
          id: insp.id.toString(),
          fechaInicio: insp.fechaInicio,
          fechaFinalizacion: insp.fechaFinalizacion,
          maquinaId: insp.maquinaId,
          numSerie: insp.numSerie,
          nSerieMotor: insp.nSerieMotor,
          cabinado: insp.cabinado,
          horometro: insp.horometro,
          creadoPor: insp.creadoPor,
          creadoEn: insp.creadoEn,
          // Incluir relaciones explícitamente
          maquina: insp.maquina
            ? {
                id: insp.maquina.id,
                nombre: insp.maquina.nombre,
              }
            : null,
          creador: insp.creador
            ? {
                id: insp.creador.id,
                nombre: insp.creador.nombre,
                correo: insp.creador.correo,
              }
            : null,
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

        // Log para debugging
        fastify.log.info({
          msg: '🔍 Inspección obtenida',
          id: inspeccion.id.toString(),
          asignacionesCount: inspeccion.asignaciones?.length,
        });

        // Serializar BigInt a string
        const inspeccionSerializada = {
          ...inspeccion,
          id: inspeccion.id.toString(),
          asignaciones: inspeccion.asignaciones?.map(asignacion => ({
            ...asignacion,
            id: asignacion.id.toString(),
            inspeccionId: asignacion.inspeccionId.toString(),
          })),
        };

        fastify.log.info({
          msg: '📤 Enviando respuesta serializada',
          asignacionesCount: inspeccionSerializada.asignaciones?.length,
        });

        return reply.send(inspeccionSerializada);
      } catch (error) {
        fastify.log.error({ error }, 'Error al obtener inspección:');
        return reply.internalServerError('Error al obtener la inspección');
      }
    }
  );

  /**
   * GET /inspecciones/:id/checklists
   * Obtener los checklists de una inspección con sus respuestas
   * Acceso: Automático (cualquier usuario autenticado)
   */
  fastify.get<{ Params: { id: string } }>(
    '/:id/checklists',
    { schema: getChecklistsSchema },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const inspeccionId = BigInt(id);

        const checklists =
          await fastify.services.inspecciones.getChecklists(inspeccionId);

        return reply.send({
          checklists,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error al obtener checklists:');
        return reply.internalServerError('Error al obtener los checklists');
      }
    }
  );

  /**
   * GET /inspecciones/roles
   * Obtener roles de asignación disponibles
   * Acceso: Automático (cualquier usuario autenticado)
   */
  fastify.get('/roles', async (request, reply) => {
    try {
      const roles = await fastify.services.inspecciones.getRolesAsignacion();

      return reply.send({
        roles,
        total: roles.length,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Error al obtener roles:');
      return reply.internalServerError('Error al obtener los roles');
    }
  });
};
