import type { CargosConfigResponse } from '@/models/auth';
import { cargosConfigSchema, profileMeSchema } from '@/schemas/auth';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

/**
 * Rutas GET de autenticación
 */

export const getAuthRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * GET /auth/cargos - Obtener jerarquía de cargos
   */
  fastify.get<{ Reply: CargosConfigResponse }>(
    '/cargos',
    {
      config: {
        requiresAuth: false, // Deshabilitar autenticación automática (endpoint público)
      },
      schema: cargosConfigSchema,
    },
    async (request, reply) => {
      try {
        // 1. Obtener todos los cargos activos usando el servicio
        const cargos = await fastify.services.auth.getCargosHierarchy();

        // 2. Transformar a formato de jerarquía: { "operador": 1, "supervisor": 2, ... }
        const hierarchy = cargos.reduce<Record<string, number>>(
          (acc, cargo) => {
            acc[cargo.nombre.toLowerCase()] = cargo.nivel;
            return acc;
          },
          {}
        );

        // 3. Retornar respuesta
        return reply.send({
          hierarchy,
        });
      } catch (error) {
        fastify.log.error(
          { error },
          'Error al obtener configuración de cargos'
        );
        return reply.internalServerError(
          'Error al obtener la configuración de cargos'
        );
      }
    }
  );

  /**
   * GET /auth/profile/me - Obtener perfil del usuario actual
   */
  fastify.get(
    '/profile/me',
    {
      schema: profileMeSchema,
    },
    async (request, reply) => {
      try {
        // El usuario YA está autenticado gracias al plugin global (requireAuth)
        // Verificación de seguridad adicional (no debería ser necesario)
        if (!request.currentUser) {
          return reply.unauthorized('Usuario no autenticado');
        }

        // 1. Obtener datos actualizados del usuario usando el servicio registrado
        const usuario = await fastify.services.auth.getUserByIdAuth(
          request.currentUser.id
        );

        if (!usuario) {
          return reply.notFound('Usuario no encontrado');
        }

        // 2. Retornar perfil del usuario
        return reply.send(usuario);
      } catch (error) {
        fastify.log.error({ error }, 'Error al obtener perfil de usuario');
        return reply.internalServerError(
          'Error al obtener el perfil del usuario'
        );
      }
    }
  );
};
