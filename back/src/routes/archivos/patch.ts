import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { actualizarArchivoSchema } from '@/schemas/archivos';
import type { ActualizarArchivoBody, ArchivoParams } from '@/models/archivo';

/**
 * Rutas PATCH de archivos
 */
export const patchArchivosRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * PATCH /archivos/:id - Actualiza información de un archivo
   */
  fastify.patch<{ Params: ArchivoParams; Body: ActualizarArchivoBody }>(
    '/:id',
    {
      schema: actualizarArchivoSchema,
    },
    async (request, reply) => {
      if (!request.currentUser) {
        return reply.unauthorized('Usuario no autenticado');
      }

      const { nombre, observacionId } = request.body;

      const datos: {
        nombre?: string;
        observacionId?: bigint | null;
      } = {};

      if (nombre !== undefined) datos.nombre = nombre;
      if (observacionId !== undefined) {
        datos.observacionId = observacionId ? BigInt(observacionId) : null;
      }

      const archivo = await fastify.services.archivos.actualizarArchivo(
        BigInt(request.params.id),
        datos,
        request.currentUser.id
      );

      return reply.send({
        ...archivo,
        id: archivo.id.toString(),
        tamano: archivo.tamano.toString(),
        observacionId: archivo.observacionId?.toString() ?? null,
      });
    }
  );
};
