import fastifyEnv from '@fastify/env';
import addFormats from 'ajv-formats';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { envSchema } from '../models/config';

async function envPlugin(app: FastifyInstance) {
  await app.register(fastifyEnv, {
    schema: envSchema,
    dotenv: true,
    ajv: {
      customOptions(ajvInstance) {
        addFormats(ajvInstance);
        return ajvInstance;
      },
    },
  });
}

export default fp(envPlugin, {
  name: 'env',
});
