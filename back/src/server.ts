import sensible from '@fastify/sensible';
import Fastify from 'fastify';
import authPlugin from './plugins/auth';
import cookiePlugin from './plugins/cookie';
import corsPlugin from './plugins/cors';
import envPlugin from './plugins/env';
import helmetPlugin from './plugins/helmet';
import jwtPlugin from './plugins/jwt';
import normalizationPlugin from './plugins/normalization';
import prismaPlugin from './plugins/prisma';
import rateLimitPlugin from './plugins/rateLimit';
import swaggerPlugin from './plugins/swagger';
// import authRoutes from './routes/auth/index';

const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'SYS:HH:MM:ss',
      },
    },
  },
  ajv: {
    customOptions: {
      keywords: ['example'],
      coerceTypes: true, // Convierte automáticamente strings a numbers/booleans
    },
  },
});

async function start() {
  try {
    // Registrar plugins (ORDEN CRÍTICO)
    await app.register(envPlugin); // 1. Variables de entorno
    await app.register(sensible); // 2. Manejo de errores HTTP
    await app.register(prismaPlugin); // 3. Base de datos (Prisma ORM)
    await app.register(normalizationPlugin); // 4. Normalización automática de datos
    await app.register(cookiePlugin); // 5. Cookies seguras
    await app.register(rateLimitPlugin); // 6. Rate Limiting
    await app.register(helmetPlugin); // 7. Seguridad HTTP
    await app.register(corsPlugin); // 8. CORS
    await app.register(jwtPlugin); // 9. Autenticación JWT
    await app.register(authPlugin); // 10. Plugin de autenticación global
    await app.register(swaggerPlugin); // 11. Swagger y Swagger UI para documentación

    // Ruta raíz - Redirección a documentación (oculta de Swagger)
    app.get(
      '/',
      {
        schema: { hide: true },
      },
      (request, reply) => {
        return reply.redirect('/documentation');
      }
    );

    // 11. Rutas con prefijos
    // await app.register(authRoutes, { prefix: '/auth' }); // Gestión de Autenticación/Usuarios

    // Iniciar servidor
    await app.listen({
      port: app.config.PORT,
      host: app.config.HOST,
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
