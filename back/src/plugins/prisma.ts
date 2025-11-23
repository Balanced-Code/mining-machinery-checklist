import { PrismaClient } from '@/generated/prisma/index';
import fastifyPrisma from '@joggr/fastify-prisma';
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

// Extiende el tipo de FastifyInstance para incluir prisma (REQUERIDO para tipos)
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

/**
 * Plugin de Prisma usando @joggr/fastify-prisma
 *
 * Plugin oficial de la comunidad que proporciona una instancia singleton
 * de PrismaClient con gestión automática del ciclo de vida.
 *
 * Características:
 * - Conexión/desconexión automática
 * - Singleton pattern (una sola instancia)
 * - Type safety completo
 * - Mantenimiento profesional
 *
 * Uso en rutas:
 * ```typescript
 * app.get('/users', async (request, reply) => {
 *   const users = await request.server.prisma.usuario.findMany();
 *   return users;
 * });
 * ```
 */
const prismaPlugin: FastifyPluginAsync = async fastify => {
  // Crear instancia de Prisma con configuración personalizada
  const prisma = new PrismaClient({
    log:
      fastify.config.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    errorFormat: 'pretty',
  });

  // Registrar el plugin oficial con nuestro cliente configurado
  await fastify.register(fastifyPrisma, {
    client: prisma,
  });

  fastify.log.info('Prisma plugin oficial registrado correctamente');
};

export default fp(prismaPlugin, {
  name: 'prismaPlugin',
  dependencies: ['env'], // Se asegura que el plugin de environment se cargue ANTES, solo por seguridad
});
