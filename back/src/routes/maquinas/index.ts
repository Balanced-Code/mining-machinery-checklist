import { getMaquinasRoutes } from './get';
import { postMaquinasRoutes } from './post';
import { putMaquinasRoutes } from './put';
import { deleteMaquinasRoutes } from './delete';
import type { FastifyPluginAsync } from 'fastify';

export const maquinasRoutes: FastifyPluginAsync = async fastify => {
  await fastify.register(getMaquinasRoutes);
  await fastify.register(postMaquinasRoutes);
  await fastify.register(putMaquinasRoutes);
  await fastify.register(deleteMaquinasRoutes);
};

export default maquinasRoutes;
