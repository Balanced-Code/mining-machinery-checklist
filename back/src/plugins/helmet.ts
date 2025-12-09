import helmet from '@fastify/helmet';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

async function helmetPlugin(app: FastifyInstance) {
  const isProduction = app.config.NODE_ENV === 'production';

  // En desarrollo, deshabilitar Helmet completamente para evitar conflictos con Swagger UI
  if (!isProduction) {
    app.log.info(
      `Plugin Helmet deshabilitado en entorno: ${app.config.NODE_ENV}`
    );
    return;
  }

  await app.register(helmet, {
    // Desactivar CSP para permitir acceso en red local
    contentSecurityPolicy: false,

    // Desactivar para permitir HTTP en red local
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,

    // Protección contra clickjacking
    frameguard: {
      action: 'sameorigin',
    },

    // Desactivar HSTS para permitir HTTP en red local
    hsts: false,

    // Prevenir que el navegador infiera el MIME type
    noSniff: true,

    // Protección XSS
    xssFilter: true,
  });

  app.log.info(
    `Plugin Helmet configurado para entorno: ${app.config.NODE_ENV}`
  );
}

export default fp(helmetPlugin, {
  name: 'helmetPlugin',
  dependencies: ['env'],
});
