import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import path from 'node:path';

/**
 * Plugin para servir archivos estáticos
 * Configura directorios para:
 * 1. Archivos subidos (/uploads)
 * 2. Frontend Angular compilado (raíz /)
 */
async function staticPlugin(fastify: FastifyInstance) {
  const uploadsPath = path.join(process.cwd(), 'uploads');
  const publicPath = path.join(process.cwd(), 'public');

  // Servir frontend Angular en producción PRIMERO (para que tenga precedencia)
  if (fastify.config.NODE_ENV === 'production') {
    // Verificar si existe el directorio public
    const fs = await import('node:fs/promises');
    try {
      await fs.access(publicPath);

      // Registrar plugin para servir frontend
      await fastify.register(fastifyStatic, {
        root: publicPath,
        prefix: '/',
        decorateReply: true, // Permitir reply.sendFile
        index: ['index.html'],
        wildcard: false, // Deshabilitar wildcard para evitar conflictos
        // Cache más corto para el frontend (1 día)
        maxAge: '1d',
        etag: true,
      });

      fastify.log.info(`Frontend Angular servido desde: ${publicPath}`);

      // Ruta catch-all para SPA routing (SOLO para rutas sin extensión)
      fastify.setNotFoundHandler(async (request, reply) => {
        // Si la ruta empieza con /api o /uploads, retornar 404 JSON
        if (
          request.url.startsWith('/api') ||
          request.url.startsWith('/uploads')
        ) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Ruta no encontrada',
          });
        }

        // Si la ruta tiene una extensión de archivo, retornar 404
        const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(request.url);
        if (hasFileExtension) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Archivo no encontrado',
          });
        }

        // Para rutas sin extensión (rutas del SPA), servir index.html
        return reply.sendFile('index.html', { cacheControl: false });
      });
    } catch {
      fastify.log.warn(
        'Directorio public no encontrado. El frontend no será servido.'
      );
      fastify.log.warn(
        'Para servir el frontend, compílalo y copia los archivos a: ' +
          publicPath
      );
    }
  }

  // Registrar plugin de archivos estáticos para uploads DESPUÉS
  await fastify.register(fastifyStatic, {
    root: uploadsPath,
    prefix: '/uploads/',
    decorateReply: false,
    // Habilitar soporte para ETags (caché HTTP)
    etag: true,
    // Permitir listado de directorios en desarrollo
    list: fastify.config.NODE_ENV === 'development',
    // Cache control - 1 año para archivos (ya que usamos hash para deduplicación)
    maxAge: '365d',
    immutable: true,
    // Configuración de seguridad
    dotfiles: 'deny', // No servir archivos ocultos
    index: false, // No servir index.html
  });

  fastify.log.info(`Archivos subidos servidos desde: ${uploadsPath}`);
}

export default fp(staticPlugin, {
  name: 'static-plugin',
  dependencies: ['env'],
});
