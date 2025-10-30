import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { loginRoute } from './post';

const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Registrar rutas de autenticación
  await fastify.register(loginRoute); // login y logout
};

export default authRoutes;
