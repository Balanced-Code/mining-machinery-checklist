import type { FastifyPluginAsync } from 'fastify';
import { updateInspeccionSchema } from '@/schemas/inspecciones';
import { requireCargoLevel } from '@/middlewares/auth';
import type { UpdateInspeccionData, InspeccionData } from '@/models/inspeccion';

interface UpdateInspeccionParams {
  id: string; // BigInt como string en URL
}

interface UpdateInspeccionBody {
  fechaInicio?: string;
  fechaFinalizacion?: string;
  numSerie?: string;
  nSerieMotor?: string;
  cabinado?: boolean;
  horometro?: number;
}

export const inspeccionesPatchRoutes: FastifyPluginAsync = async fastify => {
  /**
   * PATCH /inspecciones/:id - Actualizar inspección
   * Requiere nivel 3+ (Inspector o Administrador)
   * Solo permite editar inspecciones NO finalizadas
   * Para editar inspecciones finalizadas, usar PATCH /inspecciones/:id/admin (nivel 4 requerido)
   */
  fastify.patch<{
    Params: UpdateInspeccionParams;
    Body: UpdateInspeccionBody;
  }>(
    '/:id',
    {
      preHandler: requireCargoLevel(3),
      schema: updateInspeccionSchema,
    },
    async (request, reply) => {
      try {
        const userId = request.currentUser!.id;
        const userLevel = request.currentUser!.cargoNivel;
        const id = BigInt(request.params.id);
        const body = request.body;

        // Verificar que la inspección existe
        const inspeccionExistente =
          await fastify.services.inspecciones.getInspeccionById(id);

        if (!inspeccionExistente) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Inspección no encontrada',
          });
        }

        // Si está finalizada, solo nivel 4 (administradores) pueden editarla
        // usando el endpoint /inspecciones/:id/admin
        if (inspeccionExistente.fechaFinalizacion && userLevel < 4) {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message:
              'No se puede modificar una inspección finalizada. Solo los administradores pueden hacerlo usando el endpoint /inspecciones/:id/admin',
          });
        }

        // Construir datos de actualización condicionalmente
        const data: UpdateInspeccionData = {};

        if (body.fechaInicio) {
          data.fechaInicio = new Date(body.fechaInicio);
        }
        // Si es admin (nivel 4) editando una inspección finalizada, permitir actualizar fechaFinalizacion
        if (body.fechaFinalizacion !== undefined && userLevel >= 4) {
          data.fechaFinalizacion = body.fechaFinalizacion
            ? new Date(body.fechaFinalizacion)
            : undefined;
        } else if (body.fechaFinalizacion) {
          // Para no-admins, solo permitir establecer fechaFinalizacion si no es null
          data.fechaFinalizacion = new Date(body.fechaFinalizacion);
        }
        if (body.numSerie !== undefined) {
          data.numSerie = body.numSerie;
        }
        if (body.nSerieMotor !== undefined) {
          data.nSerieMotor = body.nSerieMotor;
        }
        if (body.cabinado !== undefined) {
          data.cabinado = body.cabinado;
        }
        if (body.horometro !== undefined) {
          data.horometro = body.horometro;
        }

        const inspeccion = await fastify.services.inspecciones.updateInspeccion(
          id,
          data,
          userId
        );

        const inspeccionWithRelations = inspeccion as InspeccionData & {
          maquina?: { id: number; nombre: string };
          creador?: { id: number; nombre: string; correo: string };
        };

        return reply.send({
          success: true,
          message: 'Inspección actualizada exitosamente',
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
        if (
          error instanceof Error &&
          error.message.includes('Record to update not found')
        ) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Inspección no encontrada',
          });
        }

        fastify.log.error({ error }, 'Error al actualizar inspección');
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Error al actualizar la inspección',
        });
      }
    }
  );

  /**
   * PATCH /inspecciones/:id/admin - Actualizar inspección finalizada (solo administradores)
   * Requiere nivel 4 (Administrador)
   * Permite editar inspecciones finalizadas
   */
  fastify.patch<{
    Params: UpdateInspeccionParams;
    Body: UpdateInspeccionBody;
  }>(
    '/:id/admin',
    {
      preHandler: requireCargoLevel(4),
      schema: updateInspeccionSchema,
    },
    async (request, reply) => {
      try {
        const userId = request.currentUser!.id;
        const id = BigInt(request.params.id);
        const body = request.body;

        // Verificar que la inspección existe
        const inspeccionExistente =
          await fastify.services.inspecciones.getInspeccionById(id);

        if (!inspeccionExistente) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Inspección no encontrada',
          });
        }

        // Los administradores pueden editar inspecciones finalizadas
        // No hay restricción por fechaFinalizacion

        // Construir datos de actualización condicionalmente
        const data: UpdateInspeccionData = {};

        if (body.fechaInicio) {
          data.fechaInicio = new Date(body.fechaInicio);
        }
        if (body.fechaFinalizacion !== undefined) {
          data.fechaFinalizacion = body.fechaFinalizacion
            ? new Date(body.fechaFinalizacion)
            : undefined;
        }
        if (body.numSerie !== undefined) {
          data.numSerie = body.numSerie;
        }
        if (body.nSerieMotor !== undefined) {
          data.nSerieMotor = body.nSerieMotor;
        }
        if (body.cabinado !== undefined) {
          data.cabinado = body.cabinado;
        }
        if (body.horometro !== undefined) {
          data.horometro = body.horometro;
        }

        const inspeccion = await fastify.services.inspecciones.updateInspeccion(
          id,
          data,
          userId
        );

        const inspeccionWithRelations = inspeccion as InspeccionData & {
          maquina?: { id: number; nombre: string };
          creador?: { id: number; nombre: string; correo: string };
        };

        return reply.send({
          success: true,
          message: 'Inspección actualizada exitosamente (admin)',
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
        if (
          error instanceof Error &&
          error.message.includes('Record to update not found')
        ) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Inspección no encontrada',
          });
        }

        fastify.log.error({ error }, 'Error al actualizar inspección (admin)');
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Error al actualizar la inspección',
        });
      }
    }
  );
};
