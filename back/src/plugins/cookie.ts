import cookie from '@fastify/cookie';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

// Configuración de cookies para red local (HTTP)
const COOKIE_CONFIG = {
  // Desactivar secure para permitir HTTP en red local
  secure: false,
  httpOnly: true, // JavaScript no puede acceder (protección XSS)
  sameSite: 'lax' as const, // Permitir cookies en navegación cross-site
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
