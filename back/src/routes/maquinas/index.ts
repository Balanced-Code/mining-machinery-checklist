import { getMaquinasRoutes } from './get';
import { postMaquinasRoutes } from './post';
import type { FastifyPluginAsync } from 'fastify';

export const maquinasRoutes: FastifyPluginAsync = async fastify => {
  await fastify.register(getMaquinasRoutes);
  await fastify.register(postMaquinasRoutes);
};

export default maquinasRoutes;
