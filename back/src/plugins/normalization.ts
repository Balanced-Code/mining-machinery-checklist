import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { setupNormalizationHooks } from '../middlewares/normalization';

/**
 * Plugin de normalización automática y serialización de fechas
 * Configura hooks para:
 * - preValidation: normalizar datos de entrada (username, email, etc.)
 * - preSerialization: convertir fechas específicas a ISO string automáticamente
 */
const normalizationPlugin = async (fastify: FastifyInstance) => {
  // Configurar hooks de normalización automática
  setupNormalizationHooks(fastify);

  fastify.log.info('Normalization and date serialization hooks configured');
};

export default fp(normalizationPlugin, {
  dependencies: ['@fastify/sensible'], // Requiere sensible para httpErrors
});
