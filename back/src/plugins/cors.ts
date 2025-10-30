import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

async function corsPlugin(app: FastifyInstance) {
  await app.register(cors, {
    // CLAVE: Permitir credenciales (cookies)
    credentials: true,

    // IMPORTANTE: No usar '*' cuando credentials: true
    origin: (origin, cb) => {
      // Lista de orígenes permitidos para desarrollo y producción
      const allowedOrigins = [
        'http://localhost:4200', // Angular dev server
        'http://127.0.0.1:4200', // Angular dev server (IP)
      ];

      // En desarrollo, permitir cualquier localhost
      if (
        !origin ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1')
      ) {
        cb(null, true);
        return;
      }

      // En producción, verificar lista permitida
      if (allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }

      // Rechazar otros orígenes
      cb(new Error('Not allowed by CORS'), false);
    },

    // Métodos HTTP permitidos
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    // Headers permitidos
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'X-HTTP-Method-Override',
    ],

    // Headers que el cliente puede leer
    exposedHeaders: ['set-cookie'],

    // Tiempo de cache para preflight requests
    maxAge: 86400, // 24 horas
  });

  app.log.info('Plugin CORS configurado correctamente para cookies');
}

export default fp(corsPlugin);
