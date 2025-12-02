import type { FastifyPluginAsync } from 'fastify';
import {
  createInspeccionSchema,
  guardarRespuestaSchema,
  terminarInspeccionSchema,
} from '@/schemas/inspecciones';
import { requireCargoLevel } from '@/middlewares/auth';
import type {
  CreateInspeccionCompleteData,
  InspeccionData,
} from '@/models/inspeccion';

interface CreateInspeccionBody {
  fechaInicio: string;
  fechaFinalizacion?: string;
  maquinaId: number;
  numSerie: string;
  nSerieMotor?: string;
  cabinado?: boolean;
  horometro?: number;
  templateIds: number[];
}

export const inspeccionesPostRoutes: FastifyPluginAsync = async fastify => {
  /**
   * POST /inspecciones - Crear nueva inspección
   * Requiere nivel 3+ (Inspector o Administrador)
   */
  fastify.post<{ Body: CreateInspeccionBody }>(
    '/',
    {
      preHandler: requireCargoLevel(3),
      schema: createInspeccionSchema,
    },
    async (request, reply) => {
      try {
        const userId = request.currentUser!.id;
        const body = request.body;

        // Convertir fechas de string a Date
        const data: CreateInspeccionCompleteData = {
          fechaInicio: new Date(body.fechaInicio),
          fechaFinalizacion: body.fechaFinalizacion
            ? new Date(body.fechaFinalizacion)
            : undefined,
          maquinaId: body.maquinaId,
          numSerie: body.numSerie,
          nSerieMotor: body.nSerieMotor,
          cabinado: body.cabinado,
          horometro: body.horometro,
          templateIds: body.templateIds,
        };

        const inspeccion = await fastify.services.inspecciones.createInspeccion(
          data,
          userId
        );

        const inspeccionWithRelations = inspeccion as InspeccionData & {
          maquina?: { id: number; nombre: string };
          creador?: { id: number; nombre: string; correo: string };
        };

        return reply.code(201).send({
          success: true,
          message: 'Inspección creada exitosamente',
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
            maquina: inspeccionWithRelations.maquina,
            creador: inspeccionWithRelations.creador,
          },
        });
      } catch (error) {
        // Manejar error de Prisma para número de serie duplicado
        if (error && typeof error === 'object' && 'code' in error) {
          const prismaError = error as {
            code: string;
            meta?: { target?: string[] };
          };
          if (
            prismaError.code === 'P2002' &&
            prismaError.meta?.target?.includes('num_serie')
          ) {
            request.log.warn(
              `Intento de crear inspección con número de serie duplicado: ${request.body.numSerie}`
            );
            return reply.code(409).send({
              statusCode: 409,
              error: 'Conflict',
              message: 'El número de serie ya existe',
              prismaError: {
                code: prismaError.code,
                meta: prismaError.meta,
              },
            });
          }
        }

        if (error instanceof Error) {
          if (
            error.message.includes('no encontrada') ||
            error.message.includes('no fueron encontrados')
          ) {
            request.log.warn(
              `Error de validación al crear inspección: ${error.message}`
            );
            return reply.code(404).send({
              statusCode: 404,
              error: 'Not Found',
              message: error.message,
            });
          }
        }

        fastify.log.error({ error }, 'Error al crear inspección');
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Error al crear la inspección',
        });
      }
    }
  );
};

/**
 * Interfaces para guardar respuesta
 */
interface GuardarRespuestaBody {
  inspeccionId: string; // BigInt como string
  templateId: number;
  templateSeccionId: number;
  cumple: boolean | null;
  observacion?: {
    id?: number;
    descripcion: string;
    archivosExistentes?: number[];
  };
}

/**
 * POST /inspecciones/respuestas - Guardar respuesta a un ítem del checklist
 * Requiere autenticación
 */
export const guardarRespuestaRoute: FastifyPluginAsync = async fastify => {
  fastify.post<{ Body: GuardarRespuestaBody }>(
    '/respuestas',
    {
      schema: guardarRespuestaSchema,
    },
    async (request, reply) => {
      try {
        const userId = request.currentUser!.id;
        const userLevel = request.currentUser!.cargoNivel;
        const body = request.body;

        // Verificar que la inspección existe
        const inspeccion =
          await fastify.services.inspecciones.getInspeccionById(
            BigInt(body.inspeccionId)
          );

        if (!inspeccion) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Inspección no encontrada',
          });
        }

        // Si la inspección está finalizada, solo nivel 4 (administradores) pueden guardar respuestas
        if (inspeccion.fechaFinalizacion && userLevel < 4) {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message:
              'No se pueden guardar respuestas en una inspección finalizada',
          });
        }

        const resultado = await fastify.services.inspecciones.guardarRespuesta({
          inspeccionId: BigInt(body.inspeccionId),
          templateId: body.templateId,
          templateSeccionId: body.templateSeccionId,
          cumple: body.cumple,
          observacion: body.observacion
            ? {
                ...(body.observacion.id !== undefined && {
                  id: body.observacion.id,
                }),
                descripcion: body.observacion.descripcion,
                ...(body.observacion.archivosExistentes && {
                  archivosExistentes: body.observacion.archivosExistentes,
                }),
              }
            : undefined,
          userId,
        });

        const statusCode =
          resultado.eleccionRespuesta.creadoEn.getTime() ===
          resultado.eleccionRespuesta.actualizadoEn?.getTime()
            ? 201
            : 200;

        return reply.code(statusCode).send({
          success: true,
          message:
            statusCode === 201
              ? 'Respuesta guardada exitosamente'
              : 'Respuesta actualizada exitosamente',
          eleccionRespuesta: {
            id: resultado.eleccionRespuesta.id,
            eleccionTemplateId: resultado.eleccionRespuesta.eleccionTemplateId,
            templateSeccionId: resultado.eleccionRespuesta.templateSeccionId,
            resultadoAtributoChecklistId: resultado.resultado.id.toString(),
          },
        });
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message.includes('no encontrada') ||
            error.message.includes('no encontrado')
          ) {
            request.log.warn(
              `Error de validación al guardar respuesta: ${error.message}`
            );
            return reply.code(404).send({
              statusCode: 404,
              error: 'Not Found',
              message: error.message,
            });
          }
        }

        fastify.log.error({ error }, 'Error al guardar respuesta');
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Error al guardar la respuesta',
        });
      }
    }
  );

  /**
   * POST /inspecciones/:id/templates - Agregar un template a una inspección
   * Requiere nivel 3+ (Inspector o Administrador)
   */
  fastify.post<{
    Params: { id: string };
    Body: { templateId: number };
  }>(
    '/:id/templates',
    {
      preHandler: requireCargoLevel(3),
    },
    async (request, reply) => {
      try {
        const userId = request.currentUser!.id;
        const userLevel = request.currentUser!.cargoNivel;
        const { id } = request.params;
        const { templateId } = request.body;
        const inspeccionId = BigInt(id);

        const eleccionTemplate =
          await fastify.services.inspecciones.agregarTemplate(
            inspeccionId,
            templateId,
            userId,
            userLevel
          );

        return reply.code(201).send({
          success: true,
          message: 'Checklist agregado exitosamente',
          eleccionTemplate: {
            id: eleccionTemplate.id,
            templateId: eleccionTemplate.templateId,
            inspeccionId: eleccionTemplate.inspeccionId.toString(),
          },
        });
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message.includes('no encontrada') ||
            error.message.includes('no encontrado') ||
            error.message.includes('finalizada') ||
            error.message.includes('ya está agregado')
          ) {
            request.log.warn(`Error al agregar template: ${error.message}`);
            return reply.code(400).send({
              statusCode: 400,
              error: 'Bad Request',
              message: error.message,
            });
          }
        }

        fastify.log.error({ error }, 'Error al agregar template');
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Error al agregar el checklist',
        });
      }
    }
  );

  /**
   * POST /inspecciones/:id/asignaciones - Asignar un usuario con rol a una inspección
   * Requiere nivel 3+ (Inspector o Administrador)
   */
  fastify.post<{
    Params: { id: string };
    Body: { usuarioId: number; rolAsignacionId: number };
  }>(
    '/:id/asignaciones',
    {
      preHandler: requireCargoLevel(3),
    },
    async (request, reply) => {
      try {
        const userId = request.currentUser!.id;
        const { id } = request.params;
        const { usuarioId, rolAsignacionId } = request.body;
        const inspeccionId = BigInt(id);

        const asignacion = await fastify.services.inspecciones.asignarUsuario(
          inspeccionId,
          usuarioId,
          rolAsignacionId,
          userId
        );

        return reply.code(201).send({
          success: true,
          message: 'Usuario asignado exitosamente',
          asignacion: {
            id: asignacion.id,
            usuarioId: asignacion.usuarioId,
            rolAsignacionId: asignacion.rolAsignacionId,
          },
        });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('no encontrad')) {
            request.log.warn(`Error al asignar usuario: ${error.message}`);
            return reply.code(404).send({
              statusCode: 404,
              error: 'Not Found',
              message: error.message,
            });
          }
        }

        fastify.log.error({ error }, 'Error al asignar usuario');
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Error al asignar el usuario',
        });
      }
    }
  );
};

/**
 * POST /inspecciones/:id/terminar - Finalizar una inspección
 * Requiere autenticación
 */
export const terminarInspeccionRoute: FastifyPluginAsync = async fastify => {
  fastify.post<{ Params: { id: string } }>(
    '/:id/terminar',
    {
      schema: terminarInspeccionSchema,
    },
    async (request, reply) => {
      try {
        const userId = request.currentUser!.id;
        const { id } = request.params;
        const inspeccionId = BigInt(id);

        await fastify.services.inspecciones.terminarInspeccion(
          inspeccionId,
          userId
        );

        // Obtener la inspección completa con relaciones
        const inspeccionCompleta =
          await fastify.services.inspecciones.getInspeccionById(inspeccionId);

        if (!inspeccionCompleta) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Inspección no encontrada',
          });
        }

        return reply.send({
          success: true,
          message: 'Inspección finalizada exitosamente',
          inspeccion: {
            id: inspeccionCompleta.id.toString(),
            fechaInicio: inspeccionCompleta.fechaInicio.toISOString(),
            fechaFinalizacion:
              inspeccionCompleta.fechaFinalizacion?.toISOString() ?? null,
            maquinaId: inspeccionCompleta.maquinaId,
            numSerie: inspeccionCompleta.numSerie,
            nSerieMotor: inspeccionCompleta.nSerieMotor,
            cabinado: inspeccionCompleta.cabinado,
            horometro: inspeccionCompleta.horometro
              ? Number(inspeccionCompleta.horometro)
              : null,
            creadoPor: inspeccionCompleta.creadoPor,
            maquina: inspeccionCompleta.maquina,
            creador: inspeccionCompleta.creador,
            asignaciones: inspeccionCompleta.asignaciones?.map(a => ({
              id: a.id.toString(),
              inspeccionId: a.inspeccionId.toString(),
              usuarioId: a.usuarioId,
              rolAsignacionId: a.rolAsignacionId,
              usuario: a.usuario,
              rolAsignacion: a.rolAsignacion,
            })),
          },
        });
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message.includes('no encontrada') ||
            error.message.includes('ya está finalizada')
          ) {
            request.log.warn(`Error al finalizar inspección: ${error.message}`);
            return reply.code(404).send({
              statusCode: 404,
              error: 'Not Found',
              message: error.message,
            });
          }
        }

        fastify.log.error({ error }, 'Error al finalizar inspección');
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Error al finalizar la inspección',
        });
      }
    }
  );
};
