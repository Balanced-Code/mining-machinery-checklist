import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const getMaquinasRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  fastify.get('/', async (request, reply) => {
    try {
      const maquinas = await fastify.services.maquinas.getAllMaquinas();
      return reply.send(maquinas);
    } catch (error) {
      fastify.log.error({ error }, 'Error al obtener máquinas');
      return reply.internalServerError('Error al obtener máquinas');
    }
  });
};
