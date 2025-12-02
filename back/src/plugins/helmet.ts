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
    // Content Security Policy - estricto en producción
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },

    // Cross-Origin-Embedder-Policy
    crossOriginEmbedderPolicy: true,

    // Protección contra clickjacking
    frameguard: {
      action: 'sameorigin',
    },

    // Forzar HTTPS en producción
    hsts: {
      maxAge: 31536000, // 1 año
      includeSubDomains: true,
      preload: true,
    },

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
