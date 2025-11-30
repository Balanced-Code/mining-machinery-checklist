import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getInspeccionesRoutes } from './get';
import { deleteInspeccionesRoutes } from './delete';
import {
  inspeccionesPostRoutes,
  guardarRespuestaRoute,
  terminarInspeccionRoute,
} from './post';
import { inspeccionesPatchRoutes } from './patch';

export const inspeccionesRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  await fastify.register(getInspeccionesRoutes);
  await fastify.register(deleteInspeccionesRoutes);
  await fastify.register(inspeccionesPostRoutes);
  await fastify.register(inspeccionesPatchRoutes);
  await fastify.register(guardarRespuestaRoute);
  await fastify.register(terminarInspeccionRoute);
};

export default inspeccionesRoutes;
