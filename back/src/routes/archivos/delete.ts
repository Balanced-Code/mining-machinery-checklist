import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { eliminarArchivoSchema } from '@/schemas/archivos';
import type { ArchivoParams } from '@/models/archivo';

/**
 * Rutas DELETE de archivos
 */
export const deleteArchivosRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * DELETE /archivos/:id - Elimina un archivo
   */
  fastify.delete<{ Params: ArchivoParams }>(
    '/:id',
    {
      schema: eliminarArchivoSchema,
    },
    async (request, reply) => {
      if (!request.currentUser) {
        return reply.unauthorized('Usuario no autenticado');
      }

      try {
        await fastify.services.archivos.eliminarArchivo(
          BigInt(request.params.id),
          request.currentUser.id
        );
        return reply.send({ message: 'Archivo eliminado correctamente' });
      } catch (error) {
        if (error instanceof Error && error.message.includes('no encontrado')) {
          return reply.notFound(error.message);
        }
        throw error;
      }
    }
  );
};
