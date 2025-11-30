import type { FastifyPluginAsync } from 'fastify';
import { createInspeccionSchema } from '@/schemas/inspecciones';
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
