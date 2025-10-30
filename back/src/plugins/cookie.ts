import cookie from '@fastify/cookie';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

// Configuración de cookies seguras para JWT
const COOKIE_CONFIG = {
  // Configuración para desarrollo vs producción
  secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
  httpOnly: true, // JavaScript no puede acceder (protección XSS)
  sameSite: 'strict' as const, // Protección CSRF
  path: '/', // Disponible en toda la app
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en milisegundos
} as const;

async function cookiePlugin(app: FastifyInstance) {
  await app.register(cookie, {
    // Clave secreta para firmar cookies
    secret: app.config.COOKIE_SECRET,
    parseOptions: COOKIE_CONFIG,
  });
}

export default fp(cookiePlugin);
export { COOKIE_CONFIG };
