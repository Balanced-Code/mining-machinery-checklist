import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import { guardarUrlSchema, subirArchivoSchema } from '@/schemas/archivos';
import type { GuardarUrlBody } from '@/models/archivo';

/**
 * Rutas POST de archivos
 */
export const postArchivosRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * POST /archivos/upload - Sube un archivo al servidor
   */
  fastify.post(
    '/upload',
    {
      schema: subirArchivoSchema,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.currentUser) {
        return reply.unauthorized('Usuario no autenticado');
      }

      try {
        const data = await request.file();

        if (!data) {
          return reply.badRequest('No se proporcionó ningún archivo');
        }

        // Obtener observacionId de los campos si existe
        const observacionIdField = data.fields.observacionId;
        const observacionId =
          observacionIdField &&
          typeof observacionIdField === 'object' &&
          'value' in observacionIdField
            ? BigInt((observacionIdField as { value: string }).value)
            : undefined;

        const archivo = await fastify.services.archivos.subirArchivo(
          data,
          request.currentUser.id,
          observacionId
        );

        return reply.code(201).send({
          ...archivo,
          id: archivo.id.toString(),
          tamano: archivo.tamano.toString(),
          observacionId: archivo.observacionId?.toString() ?? null,
        });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('no permitido')) {
            return reply.badRequest(error.message);
          }
          if (error.message.includes('demasiado grande')) {
            return reply.code(413).send({ message: error.message });
          }
        }
        throw error;
      }
    }
  );

  /**
   * POST /archivos/url - Guarda una URL externa
   */
  fastify.post<{ Body: GuardarUrlBody }>(
    '/url',
    {
      schema: guardarUrlSchema,
    },
    async (request, reply) => {
      if (!request.currentUser) {
        return reply.unauthorized('Usuario no autenticado');
      }

      const { url, nombre, observacionId } = request.body;

      try {
        const archivo = await fastify.services.archivos.guardarUrlExterna(
          url,
          nombre,
          request.currentUser.id,
          observacionId ? BigInt(observacionId) : undefined
        );

        return reply.code(201).send({
          ...archivo,
          id: archivo.id.toString(),
          tamano: archivo.tamano.toString(),
          observacionId: archivo.observacionId?.toString() ?? null,
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('inválida')) {
          return reply.badRequest(error.message);
        }
        throw error;
      }
    }
  );
};
