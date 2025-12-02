import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getArchivosRoutes } from './get';
import { postArchivosRoutes } from './post';
import { patchArchivosRoutes } from './patch';
import { deleteArchivosRoutes } from './delete';

const archivosRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.register(getArchivosRoutes);
  fastify.register(postArchivosRoutes);
  fastify.register(patchArchivosRoutes);
  fastify.register(deleteArchivosRoutes);
};

export default archivosRoutes;
