import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getUsuariosRoutes } from './get';

const usuariosRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.register(getUsuariosRoutes);
};

export default usuariosRoutes;
