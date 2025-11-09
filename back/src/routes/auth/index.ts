import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getAuthRoutes } from './get';
import { postAuthRoute } from './post';
import { putAuthRoute } from './put';

const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Registrar rutas de autenticación y perfil
  await fastify.register(postAuthRoute); // POST login y logout
  await fastify.register(getAuthRoutes); // GET cargos y profile/me
  await fastify.register(putAuthRoute); // PUT cambiar password
};

export default authRoutes;
