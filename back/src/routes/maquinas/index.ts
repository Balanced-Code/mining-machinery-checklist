import { getMaquinasRoutes } from './get';
import type { FastifyPluginAsync } from 'fastify';

export const maquinasRoutes: FastifyPluginAsync = async fastify => {
  await fastify.register(getMaquinasRoutes);
};

export default maquinasRoutes;
