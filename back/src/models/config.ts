/**
 * Configuración de variables de entorno
 * Tipado fuerte para la configuración de la aplicación
 */
export interface EnvConfig {
  JWT_SECRET: string;
  COOKIE_SECRET: string;
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  HOST: string;
  DATABASE_URL: string;
}

/**
 * !Schema de validación para variables de entorno
 * !Usado por fastify-env o similar
 */
export const envSchema = {
  type: 'object',
  required: [
    'JWT_SECRET',
    'COOKIE_SECRET',
    'NODE_ENV',
    'PORT',
    'HOST',
    'DATABASE_URL',
  ],
  properties: {
    JWT_SECRET: { type: 'string', minLength: 20 },
    COOKIE_SECRET: { type: 'string', minLength: 20 },
    NODE_ENV: {
      type: 'string',
      enum: ['development', 'production', 'test'],
    },
    PORT: {
      type: 'number',
      minimum: 1024,
      maximum: 65535,
    },
    HOST: { type: 'string', format: 'ipv4' },
    DATABASE_URL: { type: 'string', format: 'uri' },
  },
} as const;
