import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getTemplatesRoutes } from './get';
import { postTemplatesRoutes } from './post';
import { patchTemplatesRoutes } from './patch';
import { deleteTemplatesRoutes } from './delete';

const templateRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  await fastify.register(getTemplatesRoutes); // GET templates y seccion
  await fastify.register(postTemplatesRoutes); // POST templates y seccion
  await fastify.register(patchTemplatesRoutes); // PATCH templates y seccion
  await fastify.register(deleteTemplatesRoutes); // DELETE tempaltes y seccion
};

export default templateRoutes;
