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
          msg: 'Inspección obtenida',
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
        const checklistsSerializados = checklists.map(
          (checklist: (typeof checklists)[0]) => ({
            ...checklist,
            items: checklist.items.map((item: (typeof checklist.items)[0]) => ({
              ...item,
              observacion: item.observacion
                ? {
                    ...item.observacion,
                    archivos: item.observacion.archivos?.map(
                      (archivo: (typeof item.observacion.archivos)[0]) => ({
                        ...archivo,
                        id: archivo.id.toString(),
                        tamano: archivo.tamano.toString(),
                        observacionId:
                          archivo.observacionId?.toString() ?? null,
                      })
                    ),
                  }
                : null,
            })),
          })
        );

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

  /**
   * GET /inspecciones/validar-num-serie/:numSerie
   * Validar si un número de serie existe y si está eliminado
   * Query params:
   *   - excludeId (opcional): ID de inspección a excluir de la validación (para edición)
   * Acceso: Nivel 3+ (para crear/editar inspecciones)
   */
  fastify.get<{
    Params: { numSerie: string };
    Querystring: { excludeId?: string };
  }>('/validar-num-serie/:numSerie', async (request, reply) => {
    try {
      const { numSerie } = request.params;
      const { excludeId } = request.query;

      // Buscar inspección con ese número de serie
      const whereCondition: { numSerie: string; id?: { not: bigint } } = {
        numSerie,
      };

      // Si se proporciona excludeId, excluir esa inspección de la búsqueda
      if (excludeId) {
        whereCondition.id = {
          not: BigInt(excludeId),
        };
      }

      const inspeccionExistente = await fastify.prisma.inspeccion.findFirst({
        where: whereCondition,
        select: {
          id: true,
          numSerie: true,
          eliminadoEn: true,
          maquina: {
            select: {
              nombre: true,
            },
          },
        },
      });

      if (!inspeccionExistente) {
        // No existe, disponible
        return reply.send({
          disponible: true,
          message: 'Número de serie disponible',
        });
      }

      // Existe, verificar si está eliminado
      if (inspeccionExistente.eliminadoEn) {
        return reply.send({
          disponible: false,
          eliminado: true,
          message:
            'El número de serie existe en una inspección eliminada. Solo un administrador puede recuperarla.',
          detalles: {
            maquina: inspeccionExistente.maquina?.nombre,
          },
        });
      }

      // Existe y está activo
      return reply.send({
        disponible: false,
        eliminado: false,
        message: 'El número de serie ya existe en una inspección activa',
        detalles: {
          maquina: inspeccionExistente.maquina?.nombre,
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Error al validar número de serie:');
      return reply.internalServerError('Error al validar el número de serie');
    }
  });
};
