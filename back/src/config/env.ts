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
};

export interface EnvConfig {
  JWT_SECRET: string;
  COOKIE_SECRET: string;
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  HOST: string;
  DATABASE_URL: string;
}

// Extender Fastify para incluir la configuración tipada
declare module 'fastify' {
  interface FastifyInstance {
    config: EnvConfig;
  }
}
