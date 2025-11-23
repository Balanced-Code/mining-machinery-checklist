import jwt from '@fastify/jwt';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { JWT_CONFIG } from '@/config/jwt';

async function jwtPlugin(app: FastifyInstance) {
  await app.register(jwt, {
    secret: app.config.JWT_SECRET,
    // Configuraciones globales de sign por defecto
    sign: {
      expiresIn: JWT_CONFIG.EXPIRES_IN,
      algorithm: JWT_CONFIG.ALGORITHM,
    },
    // Configuraciones globales de verify por defecto
    verify: {
      algorithms: [JWT_CONFIG.ALGORITHM],
    },
    // Configurar para leer JWT desde cookies automáticamente
    cookie: {
      cookieName: JWT_CONFIG.COOKIE_NAME,
      signed: false, // No firmar la cookie (JWT ya está firmado)
    },
  });
}

export default fp(jwtPlugin, { name: 'jwtPlugin' });
