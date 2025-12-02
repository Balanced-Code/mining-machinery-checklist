import { verifyJWTAndToken } from '@/middlewares/auth';
import '@/models/fastify';
import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import fp from 'fastify-plugin';

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
 * - Rutas de documentación (/documentation/*)
 * - Rutas que específicamente definen config.requiresAuth: false
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
    '/swagger.json', // Schema OpenAPI JSON (ruta alternativa)
    '/openapi.json', // Schema OpenAPI JSON (ruta alternativa)
  ];

  // Extensiones de archivos estáticos del frontend que no requieren autenticación
  const staticFileExtensions = [
    '.js',
    '.mjs',
    '.css',
    '.html',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.map',
    '.webp',
  ];

  // Rutas específicas de archivos estáticos
  const staticFilePaths = ['/favicon.ico'];

  // Hook global que se ejecuta antes de cada handler de ruta
  fastify.addHook('preHandler', async (request, reply) => {
    // Obtener la URL sin query parameters (con fallback a string vacío)
    const urlPath = (request.url ?? '').split('?')[0] || '';

    // IMPORTANTE: Las rutas API siempre requieren autenticación (excepto las marcadas explícitamente)
    // Las rutas del frontend (sin /api o /uploads) NO requieren autenticación
    // porque el frontend de Angular maneja su propio routing y autenticación del lado del cliente

    // Si la ruta NO es /api ni /uploads, es una ruta del frontend -> sin autenticación
    if (!urlPath.startsWith('/api') && !urlPath.startsWith('/uploads')) {
      fastify.log.debug({
        url: urlPath,
        method: request.method,
        message: 'Ruta del frontend - sin autenticación requerida',
      });
      return;
    }

    // Verificar si es un archivo estático específico (por ruta exacta)
    const isStaticFilePath = staticFilePaths.includes(urlPath);

    if (isStaticFilePath) {
      fastify.log.debug({
        url: urlPath,
        method: request.method,
        message: 'Archivo estático específico - sin autenticación requerida',
      });
      return;
    }

    // Verificar si es un archivo estático del frontend (por extensión)
    const isStaticFile = staticFileExtensions.some(ext =>
      urlPath.toLowerCase().endsWith(ext)
    );

    if (isStaticFile) {
      fastify.log.debug({
        url: urlPath,
        method: request.method,
        message: 'Archivo estático - sin autenticación requerida',
      });
      return; // Saltar autenticación para archivos estáticos
    }

    // Verificar si la ruta es de documentación (rutas públicas)
    const isPublicRoute = publicRoutes.some(
      route => urlPath === route || urlPath.startsWith(route + '/')
    );

    if (isPublicRoute) {
      fastify.log.debug({
        url: urlPath,
        method: request.method,
        message: 'Ruta pública - sin autenticación requerida',
      });
      return; // Saltar autenticación para rutas públicas
    }

    // Verificar si la ruta específicamente no requiere autenticación
    if (request.routeOptions?.config?.requiresAuth === false) {
      fastify.log.debug({
        url: urlPath,
        method: request.method,
        message: 'Ruta exenta de autenticación automática',
      });
      return; // Saltar autenticación para esta ruta
    }

    // Aplicar autenticación automática para todas las demás rutas
    fastify.log.debug({
      url: urlPath,
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
