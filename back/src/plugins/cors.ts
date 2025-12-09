import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

async function corsPlugin(app: FastifyInstance) {
  await app.register(cors, {
    // CLAVE: Permitir credenciales (cookies)
    credentials: true,

    // IMPORTANTE: No usar '*' cuando credentials: true
    origin: (origin, cb) => {
      // Permitir cualquier origen para app interna/LAN
      // Esto permite que dispositivos en la red local accedan
      cb(null, true);
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
