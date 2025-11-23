import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getUsuariosRoutes } from './get';
import { postUsuariosRoutes } from './post';
import { deleteUsersRoutes } from './delete';
import { putUsuariosRoutes } from './put';

const usuariosRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.register(getUsuariosRoutes);
  fastify.register(postUsuariosRoutes);
  fastify.register(putUsuariosRoutes);
  fastify.register(deleteUsersRoutes);
};

export default usuariosRoutes;
