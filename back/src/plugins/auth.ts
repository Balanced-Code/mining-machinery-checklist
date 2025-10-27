import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import fp from 'fastify-plugin';
import type { UserRole } from '../generated/prisma/index';
import { verifyJWTAndToken } from '../middlewares/auth';

// Definir tipos para el usuario autenticado
export interface AuthenticatedUser {
  id: number;
  username: string;
  email: string;
  rol: UserRole;
}

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: AuthenticatedUser;
  }

  interface FastifyContextConfig {
    requiresAuth?: boolean;
  }
}

/**
 * Lógica de autenticación (movida desde middlewares/auth.ts)
 */
async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = await verifyJWTAndToken(request);

  if (!user) {
    return reply.unauthorized('Token de autenticacion invalido o faltante');
  }

  // Agregar usuario al request para uso posterior
  request.currentUser = user;
}

/**
 * Plugin de autenticación global
 *
 * Aplica autenticación automática a todas las rutas excepto:
 * - Rutas que específicamente definen config.requiresAuth: false
 * - Rutas que no requieren autenticación (como /login)
 *
 * @param fastify Instancia de Fastify
 */
const authPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Lista de rutas que no requieren autenticación
  const publicRoutes = [
    '/', // Ruta raíz (redirección a documentación)
    '/documentation', // Documentación Swagger UI
    '/documentation/', // Documentación con trailing slash
    '/documentation/static', // Archivos estáticos de Swagger UI
    '/documentation/json', // Schema OpenAPI JSON
    '/documentation/yaml', // Schema OpenAPI YAML
    '/documentation/uiConfig', // Configuración UI de Swagger
  ];

  // Hook global que se ejecuta antes de cada handler de ruta
  fastify.addHook('preHandler', async (request, reply) => {
    // Verificar si la ruta es de documentación (rutas públicas)
    const isDocumentationRoute = publicRoutes.some(
      route => request.url === route || request.url.startsWith(route + '/')
    );

    if (isDocumentationRoute) {
      fastify.log.debug({
        url: request.url,
        method: request.method,
        message: 'Ruta de documentación - sin autenticación requerida',
      });
      return; // Saltar autenticación para rutas de documentación
    }

    // Verificar si la ruta específicamente no requiere autenticación
    if (request.routeOptions?.config?.requiresAuth === false) {
      fastify.log.debug({
        url: request.url,
        method: request.method,
        message: 'Ruta exenta de autenticación automática',
      });
      return; // Saltar autenticación para esta ruta
    }

    // Aplicar autenticación automática para todas las demás rutas
    fastify.log.debug({
      url: request.url,
      method: request.method,
      message: 'Aplicando autenticación automática',
    });

    await requireAuth(request, reply);
  });

  fastify.log.info('Plugin de autenticacion global registrado correctamente');
};

// Exportar como plugin usando fastify-plugin para evitar encapsulación
export default fp(authPlugin, {
  dependencies: ['jwtPlugin', 'prismaPlugin'], // Depende de JWT y Prisma
});
