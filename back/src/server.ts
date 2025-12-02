import sensible from '@fastify/sensible';
import Fastify from 'fastify';
import './models/fastify';
import authPlugin from './plugins/auth';
import cookiePlugin from './plugins/cookie';
import corsPlugin from './plugins/cors';
import envPlugin from './plugins/env';
import helmetPlugin from './plugins/helmet';
import jwtPlugin from './plugins/jwt';
import multipartPlugin from './plugins/multipart';
import normalizationPlugin from './plugins/normalization';
import prismaPlugin from './plugins/prisma';
import rateLimitPlugin from './plugins/rateLimit';
import servicesPlugin from './plugins/services';
import staticPlugin from './plugins/static';
import swaggerPlugin from './plugins/swagger';
import archivosRoutes from './routes/archivos';
import authRoutes from './routes/auth/index';
import templateRoutes from './routes/checklists_template';
import inspeccionesRoutes from './routes/inspecciones';
import maquinasRoutes from './routes/maquinas';
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
    await app.register(multipartPlugin); // 12. Manejo de archivos multipart
    await app.register(swaggerPlugin); // 13. Swagger
    await app.register(staticPlugin); // 14. Servir archivos estáticos

    // Rutas API con prefijo global /api
    await app.register(authRoutes, { prefix: '/api/auth' }); // Gestión de Autenticación/Perfil
    await app.register(usuariosRoutes, { prefix: '/api/usuarios' }); // Gestión de Usuarios
    await app.register(templateRoutes, { prefix: '/api/templates' }); // Gestion de Templates de Checklist
    await app.register(inspeccionesRoutes, { prefix: '/api/inspecciones' }); // Gestión de Inspecciones
    await app.register(maquinasRoutes, { prefix: '/api/maquinas' }); // Gestión de Máquinas
    await app.register(archivosRoutes, { prefix: '/api/archivos' }); // Gestión de Archivos

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
