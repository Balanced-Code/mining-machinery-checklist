import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getAuthRoutes } from './get';
import { loginRoute } from './post';

const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Registrar rutas de autenticación
  await fastify.register(loginRoute); // POST login y logout
  await fastify.register(getAuthRoutes); // GET cargos y profile/me
};

export default authRoutes;
