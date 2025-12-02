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
   * - Usuarios normales: solo inspecciones NO eliminadas
   * - Administradores (nivel 4): todas las inspecciones (incluidas eliminadas)
   */
  fastify.get(
    '/',
    { schema: getInspeccionesSchema },
    async (request, reply) => {
      try {
        const currentUser = request.currentUser!;

        // Verificar nivel del usuario
        const userCargo = await fastify.prisma.cargo.findUnique({
          where: { id: currentUser.cargoId },
          select: { nivel: true },
        });

        const isAdmin = userCargo?.nivel === 4;

        // Administradores ven todas, otros solo las no eliminadas
        const inspecciones = isAdmin
          ? await fastify.services.inspecciones.getAllInspeccionesIncludingDeleted()
          : await fastify.services.inspecciones.getAllInspecciones();

        // Serializar manualmente para preservar todas las propiedades
        const inspeccionesSerializadas = inspecciones.map(insp => ({
          id: insp.id.toString(),
          fechaInicio: insp.fechaInicio,
          fechaFinalizacion: insp.fechaFinalizacion,
          maquinaId: insp.maquinaId,
          numSerie: insp.numSerie,
          nSerieMotor: insp.nSerieMotor,
          cabinado: insp.cabinado,
          horometro: insp.horometro ? Number(insp.horometro) : null,
          creadoPor: insp.creadoPor,
          creadoEn: insp.creadoEn,
          eliminadoEn: insp.eliminadoEn, // Incluir estado de eliminación
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
          horometro: inspeccion.horometro ? Number(inspeccion.horometro) : null,
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

        // Serializar BigInt a string
        const checklistsSerializados = checklists.map(checklist => ({
          ...checklist,
          items: checklist.items.map(item => ({
            ...item,
            observacion: item.observacion
              ? {
                  ...item.observacion,
                  archivos: item.observacion.archivos?.map(archivo => ({
                    ...archivo,
                    id: archivo.id.toString(),
                    tamano: archivo.tamano.toString(),
                    observacionId: archivo.observacionId?.toString() ?? null,
                  })),
                }
              : null,
          })),
        }));

        return reply.send({
          checklists: checklistsSerializados,
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

  /**
   * GET /inspecciones/:id/export
   * Exportar una inspección a Excel con imágenes en formato ZIP
   * Acceso: Automático (cualquier usuario autenticado)
   */
  fastify.get<{ Params: { id: string } }>(
    '/:id/export',
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

        // Generar el ZIP con Excel e imágenes
        const { buffer, filename } =
          await fastify.services.excelExport.generateInspeccionZip(
            inspeccionId
          );

        // Configurar headers para descarga
        reply.header('Content-Type', 'application/zip');
        reply.header(
          'Content-Disposition',
          `attachment; filename="${filename}"`
        );

        // Enviar el buffer
        return reply.send(buffer);
      } catch (error) {
        fastify.log.error({ error }, 'Error al exportar inspección:');
        return reply.internalServerError('Error al exportar la inspección');
      }
    }
  );
};
