import sensible from '@fastify/sensible';
import Fastify from 'fastify';
import './models/fastify';
import authPlugin from './plugins/auth';
import cookiePlugin from './plugins/cookie';
import corsPlugin from './plugins/cors';
import envPlugin from './plugins/env';
import helmetPlugin from './plugins/helmet';
import jwtPlugin from './plugins/jwt';
import normalizationPlugin from './plugins/normalization';
import prismaPlugin from './plugins/prisma';
import rateLimitPlugin from './plugins/rateLimit';
import servicesPlugin from './plugins/services';
import swaggerPlugin from './plugins/swagger';
import authRoutes from './routes/auth/index';
import usuariosRoutes from './routes/usuarios';

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
    await app.register(servicesPlugin); // 4. Servicios de la aplicación
    await app.register(normalizationPlugin); // 5. Normalización automática de datos
    await app.register(cookiePlugin); // 6. Cookies seguras
    await app.register(rateLimitPlugin); // 7. Rate Limiting
    await app.register(helmetPlugin); // 8. Seguridad HTTP
    await app.register(corsPlugin); // 9. CORS
    await app.register(jwtPlugin); // 10. Autenticación JWT
    await app.register(authPlugin); // 11. Plugin de autenticación global
    await app.register(swaggerPlugin); // 12. Swagger

    // Ruta raíz - Redirección a documentación (oculta de Swagger)
    app.get(
      '/',
      {
        schema: { hide: true },
      },
      async (request, reply) => {
        return reply.redirect('/documentation');
      }
    );

    // 12. Rutas con prefijos
    await app.register(authRoutes, { prefix: '/auth' }); // Gestión de Autenticación/Perfil
    await app.register(usuariosRoutes, { prefix: '/usuarios' }); // Gestión de Usuarios
    // await app.register(templateRoutes, { prefix: '/templates' }); // Gestion de Templates de Checklist

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
