import type { FastifyPluginAsync, FastifyInstance } from 'fastify';
import { requireCargoLevel } from '@/middlewares/auth';
import { updateUsuarioSchema } from '@/schemas/usuarios';
import type { UpdateUserData } from '@/models/user';

export const putUsuariosRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * PUT /usuarios/:id - Actualizar un usuario
   * @param id - ID del usuario a actualizar
   * @param body - Datos del usuario a actualizar
   * @returns El usuario actualizado
   */
  fastify.put<{
    Params: { id: number };
    Body: UpdateUserData;
  }>(
    '/:id',
    { preHandler: requireCargoLevel(4), schema: updateUsuarioSchema },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { nombre, cargoId } = request.body;
        const updateData: UpdateUserData = {};

        const usuario = await fastify.services.usuarios.getUsuarioById(id);

        if (!usuario) {
          return reply.notFound('Usuario no encontrado');
        }

        if (cargoId) {
          const cargo = await fastify.services.usuarios.checkRole(cargoId);

          if (!cargo) {
            return reply.notFound('Cargo no encontrado');
          }

          updateData.cargoId = cargoId;
        }

        if (nombre) updateData.nombre = nombre;

        const updatedUsuario = await fastify.services.usuarios.updateUsuario(
          id,
          updateData
        );

        return reply.send({
          success: true,
          message: 'Usuario actualizado correctamente',
          user: {
            id: updatedUsuario.id,
            nombre: updatedUsuario.nombre,
            correo: updatedUsuario.correo,
            cargo: {
              nombre: updatedUsuario.cargo.nombre,
            },
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error al actualizar el usuario');
        return reply.internalServerError('Error al actualizar el usuario');
      }
    }
  );
};
