import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  listarArchivosSchema,
  obtenerArchivoSchema,
  descargarArchivoSchema,
} from '@/schemas/archivos';
import type { ArchivoParams, ListarArchivosQuery } from '@/models/archivo';
import { CategoriaArchivo } from '@/models/archivo';
import path from 'node:path';

/**
 * Rutas GET de archivos
 */
export const getArchivosRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * GET /archivos - Lista archivos con paginación
   */
  fastify.get<{ Querystring: ListarArchivosQuery }>(
    '/',
    {
      schema: listarArchivosSchema,
    },
    async (request, reply) => {
      if (!request.currentUser) {
        return reply.unauthorized('Usuario no autenticado');
      }

      const { categoria, observacionId, page = 1, limit = 20 } = request.query;

      const params: {
        categoria?: CategoriaArchivo;
        observacionId?: bigint;
        page?: number;
        limit?: number;
      } = { page, limit };

      if (categoria !== undefined)
        params.categoria = categoria as CategoriaArchivo;
      if (observacionId !== undefined)
        params.observacionId = BigInt(observacionId);

      const resultado = await fastify.services.archivos.listarArchivos(params);

      const totalPages = Math.ceil(resultado.total / limit);

      return reply.send({
        archivos: resultado.archivos.map(archivo => ({
          ...archivo,
          id: archivo.id.toString(),
          tamano: archivo.tamano.toString(),
          observacionId: archivo.observacionId?.toString() ?? null,
        })),
        total: resultado.total,
        page,
        limit,
        totalPages,
      });
    }
  );

  /**
   * GET /archivos/:id - Obtiene información de un archivo
   */
  fastify.get<{ Params: ArchivoParams }>(
    '/:id',
    {
      schema: obtenerArchivoSchema,
    },
    async (request, reply) => {
      if (!request.currentUser) {
        return reply.unauthorized('Usuario no autenticado');
      }

      const archivo = await fastify.services.archivos.obtenerArchivo(
        BigInt(request.params.id)
      );

      if (!archivo) {
        return reply.notFound('Archivo no encontrado');
      }

      return reply.send({
        ...archivo,
        id: archivo.id.toString(),
        tamano: archivo.tamano.toString(),
        observacionId: archivo.observacionId?.toString() ?? null,
      });
    }
  );

  /**
   * GET /archivos/:id/download - Descarga un archivo
   */
  fastify.get<{ Params: ArchivoParams }>(
    '/:id/download',
    {
      schema: descargarArchivoSchema,
    },
    async (request, reply) => {
      if (!request.currentUser) {
        return reply.unauthorized('Usuario no autenticado');
      }

      const archivo = await fastify.services.archivos.obtenerArchivo(
        BigInt(request.params.id)
      );

      if (!archivo) {
        return reply.notFound('Archivo no encontrado');
      }

      // Si es URL externa, redirigir
      if (archivo.url) {
        return reply.redirect(archivo.url);
      }

      // Si es archivo local, enviarlo
      if (archivo.ruta) {
        return reply.sendFile(
          archivo.ruta,
          path.join(process.cwd(), 'uploads'),
          {
            acceptRanges: true,
          }
        );
      }

      return reply.notFound('Archivo no disponible');
    }
  );
};
