import fastifyMultipart from '@fastify/multipart';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Plugin para manejar uploads multipart/form-data
 * Configura límites y opciones de seguridad para uploads
 */
async function multipartPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyMultipart, {
    limits: {
      fieldNameSize: 100, // Max field name size en bytes
      fieldSize: 1024 * 1024, // Max field value size (1MB) para campos de texto
      fields: 10, // Max número de campos no-file
      fileSize: 50 * 1024 * 1024, // Max file size: 50MB
      files: 10, // Max número de archivos por request
      headerPairs: 2000, // Max número de header key-value pairs
      parts: 20, // Max número de parts (fields + files)
    },
    // Adjuntar campos al body para facilitar el acceso
    attachFieldsToBody: false,
  });

  fastify.log.info('Plugin multipart configurado (limite: 50MB por archivo)');
}

export default fp(multipartPlugin, {
  name: 'multipart-plugin',
});
