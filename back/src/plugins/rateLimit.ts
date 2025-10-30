import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

// Configuración centralizada del rate limit
export const RATE_LIMIT_CONFIG = {
  max: 100,
  timeWindow: '1 minute',
} as const;

async function rateLimitPlugin(app: FastifyInstance) {
  await app.register(rateLimit, {
    max: RATE_LIMIT_CONFIG.max, // Máximo 100 requests
    timeWindow: RATE_LIMIT_CONFIG.timeWindow, // Por minuto
    errorResponseBuilder: function (request, context) {
      return {
        error: 'Too Many Requests',
        message: `Límite de ${context.max} requests por ${
          RATE_LIMIT_CONFIG.timeWindow
        } excedido. Reinicio en ${Math.round(context.ttl / 1000)} segundos.`,
        statusCode: 429,
        expiresIn: Math.round(context.ttl / 1000),
      };
    },
  });
}

export default fp(rateLimitPlugin);
