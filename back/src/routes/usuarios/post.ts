import { requireCargoLevel } from '@/middlewares/auth';
import type { CreateUserData } from '@/models/user';
import {
  createUsuarioSchema,
  reactiveUsuarioSchema,
  resetPasswordSchema,
} from '@/schemas/usuarios';
import bcrypt from 'bcrypt';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const postUsuariosRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * POST /usuarios/create - Crear un nuevo usuario
   * Solo administradores pueden acceder a esta ruta
   * @returns El usuario creado
   */
  fastify.post<{ Body: CreateUserData }>(
    '/create',
    { preHandler: requireCargoLevel(4), schema: createUsuarioSchema },
    async (request, reply) => {
      try {
        const { nombre, correo, cargoId } = request.body;

        const existingUser = await fastify.services.usuarios.checkUser(correo);
        if (existingUser) {
          return reply.conflict('El correo ya está registrado');
        }

        const cargo = await fastify.services.usuarios.checkRole(cargoId);
        if (!cargo) {
          return reply.notFound('El cargo especificado no existe');
        }

        const hashedPassword = await bcrypt.hash('Password123!', 10);

        const nuevoUsuario = await fastify.services.usuarios.createUsuario({
          nombre,
          correo,
          contrasena: hashedPassword,
          cargoId,
        });

        return reply.send({
          success: true,
          message: 'Usuario creado exitosamente',
          user: {
            id: nuevoUsuario.id,
            nombre: nuevoUsuario.nombre,
            correo: nuevoUsuario.correo,
            contrasena: 'Password123!',
            cargo: {
              nombre: nuevoUsuario.cargo.nombre,
            },
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error al crear el usuario:');
        return reply.internalServerError('Error al crear el usuario');
      }
    }
  );

  /**
   * POST /usuarios/:id/reset-password - Restablecer contraseña de un usuario
   * Solo administradores pueden acceder a esta ruta
   * @returns El usuario con la contraseña restablecida
   */
  fastify.post<{ Params: { id: number } }>(
    '/:id/reset-password',
    { preHandler: requireCargoLevel(4), schema: resetPasswordSchema },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const usuario = await fastify.services.usuarios.getUsuarioById(id);
        if (!usuario) {
          return reply.notFound('El usuario no existe');
        }

        const hashedPassword = await bcrypt.hash('Password123!', 10);

        const updatedUsuario = await fastify.services.usuarios.resetUsuario(
          id,
          hashedPassword
        );

        return reply.send({
          success: true,
          message: 'Contraseña restablecida exitosamente',
          user: {
            id: updatedUsuario.id,
            nombre: updatedUsuario.nombre,
            correo: updatedUsuario.correo,
            contrasena: 'Password123!',
            cargo: {
              nombre: updatedUsuario.cargo.nombre,
            },
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error al restablecer la contraseña:');
        return reply.internalServerError('Error al restablecer la contraseña');
      }
    }
  );

  /**
   * POST /usuarios/:id/reactive - Reactivar una cuenta de usuario
   * Solo administradores pueden acceder a esta ruta
   * @returns El usuario con la cuenta reactivada
   */
  fastify.post<{ Params: { id: number } }>(
    '/:id/reactive',
    { preHandler: requireCargoLevel(4), schema: reactiveUsuarioSchema },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const usuario = await fastify.services.usuarios.getDeleteUsuario(id);

        if (!usuario) {
          return reply.notFound('El usuario no existe o no esta eliminado');
        }

        await fastify.services.usuarios.reactiveUsuario(id);

        return reply.send({
          success: true,
          message: 'Cuenta reactivada exitosamente',
          user: {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            cargo: {
              nombre: usuario.cargo.nombre,
            },
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error al reactivar la cuenta:');
        return reply.internalServerError('Error al reactivar la cuenta');
      }
    }
  );
};
