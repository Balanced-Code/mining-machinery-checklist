import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import path from 'node:path';

/**
 * Plugin para servir archivos estáticos
 * Configura un directorio para almacenar y servir archivos subidos
 */
async function staticPlugin(fastify: FastifyInstance) {
  const uploadsPath = path.join(process.cwd(), 'uploads');

  // Registrar plugin de archivos estáticos
  await fastify.register(fastifyStatic, {
    root: uploadsPath,
    prefix: '/uploads/',
    decorateReply: true,
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

  fastify.log.info(`Archivos estaticos servidos desde: ${uploadsPath}`);
}

export default fp(staticPlugin, {
  name: 'static-plugin',
  dependencies: ['env'],
});
