import { AuthService } from '@/services/authService';
import { UsuariosService } from '@/services/usuariosService';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Plugin que registra todos los servicios de la aplicación como decoradores de Fastify.
 * Esto permite acceder a los servicios desde cualquier ruta mediante fastify.services
 *
 * @example
 * En cualquier ruta:
 * const usuario = await fastify.services.auth.getUserByIdAuth(id);
 */

//! Extender la interfaz de Fastify para agregar type safety
declare module 'fastify' {
  interface FastifyInstance {
    services: {
      auth: AuthService;
      usuarios: UsuariosService;
      // Aquí puedes agregar más servicios en el futuro:
      // checklist: ChecklistService;
    };
  }
}

/**
 * Plugin de servicios
 * Registra instancias singleton de todos los servicios de la aplicación
 */
async function servicesPlugin(fastify: FastifyInstance) {
  // Verificar que prisma esté disponible
  if (!fastify.prisma) {
    throw new Error(
      'Prisma no está disponible. Asegúrate de registrar el plugin de Prisma antes que el de servicios.'
    );
  }

  // Crear instancias singleton de los servicios
  const authService = new AuthService(fastify.prisma);
  const usuariosService = new UsuariosService(fastify.prisma);

  // Decorar fastify con el objeto services
  fastify.decorate('services', {
    auth: authService,
    usuarios: usuariosService,
    // Agregar más servicios aquí según sea necesario
  });

  fastify.log.info('Servicios registrados correctamente');
}

// Exportar el plugin usando fastify-plugin
// Esto asegura que los decoradores estén disponibles en toda la aplicación
export default fp(servicesPlugin, {
  name: 'services',
  dependencies: ['prismaPlugin'],
});
