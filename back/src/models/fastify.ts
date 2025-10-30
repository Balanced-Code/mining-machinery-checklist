/**
 * Extensiones de tipos de Fastify
 * Centraliza todas las declaraciones de módulos para mantener consistencia
 */

import type { AuthenticatedUser } from './auth';
import type { EnvConfig } from './config';

declare module 'fastify' {
  /**
   * Extensión de FastifyRequest para incluir usuario autenticado
   */
  interface FastifyRequest {
    currentUser?: AuthenticatedUser;
  }

  /**
   * Extensión de FastifyInstance para incluir configuración tipada
   */
  interface FastifyInstance {
    config: EnvConfig;
  }

  /**
   * Extensión de FastifyContextConfig para rutas con autenticación opcional
   */
  interface FastifyContextConfig {
    requiresAuth?: boolean;
  }
}
