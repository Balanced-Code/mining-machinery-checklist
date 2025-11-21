Recopilando información del área de trabajoPara crear los endpoints necesarios para la gestión de usuarios, necesitas implementar lo siguiente en el backend:

## 1. Crear el archivo de modelos de usuario (si no existe)

Primero, asegúrate de tener los tipos correctos en user.ts (ya existe según los excerpts).

## 2. Crear los schemas de validación

Crea `src/schemas/user/request.ts`:

```typescript
/**
 * Schemas de request para rutas de usuarios
 */

/**
 * Schema para crear usuario
 */
export const createUserBodySchema = {
  type: 'object',
  properties: {
    nombre: { type: 'string', minLength: 2, maxLength: 100 },
    correo: { type: 'string', format: 'email' },
    contrasena: { type: 'string', minLength: 8 },
    cargoId: { type: 'number', minimum: 1 },
  },
  required: ['nombre', 'correo', 'contrasena', 'cargoId'],
} as const;

/**
 * Schema para actualizar usuario
 */
export const updateUserBodySchema = {
  type: 'object',
  properties: {
    nombre: { type: 'string', minLength: 2, maxLength: 100 },
    correo: { type: 'string', format: 'email' },
    contrasena: { type: 'string', minLength: 8 },
    cargoId: { type: 'number', minimum: 1 },
  },
} as const;

/**
 * Schema para parámetro ID
 */
export const userIdParamSchema = {
  type: 'object',
  properties: {
    id: { type: 'number', minimum: 1 },
  },
  required: ['id'],
} as const;
```

## 3. Crear schemas de respuesta

Crea response.ts:

```typescript
/**
 * Schemas de response para rutas de usuarios
 */

/**
 * Schema de usuario público
 */
const userPublicSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    nombre: { type: 'string' },
    correo: { type: 'string' },
    cargo: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        nombre: { type: 'string' },
        nivel: { type: 'number' },
      },
    },
    creadoEn: { type: 'string', format: 'date-time' },
  },
} as const;

/**
 * Schema de lista de usuarios
 */
export const usersListResponseSchema = {
  description: 'Lista de usuarios',
  type: 'object',
  properties: {
    users: {
      type: 'array',
      items: userPublicSchema,
    },
    total: { type: 'number' },
  },
} as const;

/**
 * Schema de usuario individual
 */
export const userResponseSchema = {
  description: 'Usuario individual',
  ...userPublicSchema,
} as const;

/**
 * Schema de respuesta de creación/actualización
 */
export const userOperationResponseSchema = {
  description: 'Operación exitosa',
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    user: userPublicSchema,
  },
} as const;

/**
 * Schema de respuesta de eliminación
 */
export const deleteUserResponseSchema = {
  description: 'Usuario eliminado',
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
} as const;

/**
 * Schema de respuesta de reset de contraseña
 */
export const resetPasswordResponseSchema = {
  description: 'Contraseña restablecida',
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    temporaryPassword: { type: 'string' },
  },
} as const;
```

## 4. Crear schemas completos

Crea schemas.ts:

```typescript
import {
  createUserBodySchema,
  updateUserBodySchema,
  userIdParamSchema,
} from './request';
import {
  deleteUserResponseSchema,
  resetPasswordResponseSchema,
  userOperationResponseSchema,
  userResponseSchema,
  usersListResponseSchema,
} from './response';

/**
 * Schema completo para GET /users
 */
export const getUsersSchema = {
  description: 'Obtener lista de usuarios',
  tags: ['Users'],
  response: {
    200: usersListResponseSchema,
    401: {
      description: 'No autorizado',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
} as const;

/**
 * Schema completo para GET /users/:id
 */
export const getUserByIdSchema = {
  description: 'Obtener usuario por ID',
  tags: ['Users'],
  params: userIdParamSchema,
  response: {
    200: userResponseSchema,
    404: {
      description: 'Usuario no encontrado',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
} as const;

/**
 * Schema completo para POST /users
 */
export const createUserSchema = {
  description: 'Crear nuevo usuario',
  tags: ['Users'],
  body: createUserBodySchema,
  response: {
    201: userOperationResponseSchema,
    400: {
      description: 'Datos inválidos',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    409: {
      description: 'El correo ya está registrado',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
} as const;

/**
 * Schema completo para PUT /users/:id
 */
export const updateUserSchema = {
  description: 'Actualizar usuario existente',
  tags: ['Users'],
  params: userIdParamSchema,
  body: updateUserBodySchema,
  response: {
    200: userOperationResponseSchema,
    404: {
      description: 'Usuario no encontrado',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
} as const;

/**
 * Schema completo para DELETE /users/:id
 */
export const deleteUserSchema = {
  description: 'Eliminar usuario (soft delete)',
  tags: ['Users'],
  params: userIdParamSchema,
  response: {
    200: deleteUserResponseSchema,
    404: {
      description: 'Usuario no encontrado',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
} as const;

/**
 * Schema completo para POST /users/:id/reset-password
 */
export const resetPasswordSchema = {
  description: 'Restablecer contraseña de usuario',
  tags: ['Users'],
  params: userIdParamSchema,
  response: {
    200: resetPasswordResponseSchema,
    404: {
      description: 'Usuario no encontrado',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
} as const;
```

## 5. Crear archivo barrel de exports

Crea index.ts:

```typescript
/**
 * Barrel export para schemas de usuarios
 */

export {
  createUserSchema,
  deleteUserSchema,
  getUserByIdSchema,
  getUsersSchema,
  resetPasswordSchema,
  updateUserSchema,
} from './schemas';
```

## 6. Crear las rutas - GET

Crea get.ts:

```typescript
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { UserPublic } from '../../models/user';
import { getUserByIdSchema, getUsersSchema } from '../../schemas/user';

/**
 * Rutas GET de usuarios
 */
export const getUsersRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * GET /users - Obtener todos los usuarios
   */
  fastify.get<{
    Reply: { users: UserPublic[]; total: number };
  }>(
    '/',
    {
      schema: getUsersSchema,
    },
    async (request, reply) => {
      try {
        // Obtener todos los usuarios activos
        const usuarios = await fastify.prisma.usuario.findMany({
          where: {
            eliminadoEn: null,
          },
          include: {
            cargo: {
              select: {
                id: true,
                nombre: true,
                nivel: true,
              },
            },
          },
          orderBy: {
            nombre: 'asc',
          },
        });

        // Transformar a formato UserPublic
        const users: UserPublic[] = usuarios.map(usuario => ({
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          cargo: {
            id: usuario.cargo.id,
            nombre: usuario.cargo.nombre,
            nivel: usuario.cargo.nivel,
          },
          creadoEn: usuario.creadoEn,
        }));

        return reply.send({
          users,
          total: users.length,
        });
      } catch (error) {
        fastify.log.error('Error al obtener usuarios:', error);
        return reply.internalServerError('Error al obtener usuarios');
      }
    }
  );

  /**
   * GET /users/:id - Obtener usuario por ID
   */
  fastify.get<{
    Params: { id: number };
    Reply: UserPublic;
  }>(
    '/:id',
    {
      schema: getUserByIdSchema,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const usuario = await fastify.prisma.usuario.findUnique({
          where: {
            id,
            eliminadoEn: null,
          },
          include: {
            cargo: {
              select: {
                id: true,
                nombre: true,
                nivel: true,
              },
            },
          },
        });

        if (!usuario) {
          return reply.notFound('Usuario no encontrado');
        }

        const user: UserPublic = {
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          cargo: {
            id: usuario.cargo.id,
            nombre: usuario.cargo.nombre,
            nivel: usuario.cargo.nivel,
          },
          creadoEn: usuario.creadoEn,
        };

        return reply.send(user);
      } catch (error) {
        fastify.log.error('Error al obtener usuario:', error);
        return reply.internalServerError('Error al obtener usuario');
      }
    }
  );
};
```

## 7. Crear las rutas - POST

Crea post.ts:

```typescript
import bcrypt from 'bcrypt';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { randomBytes } from 'node:crypto';
import type { CreateUserData } from '../../models/user';
import { createUserSchema, resetPasswordSchema } from '../../schemas/user';

/**
 * Rutas POST de usuarios
 */
export const postUsersRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * POST /users - Crear nuevo usuario
   */
  fastify.post<{
    Body: CreateUserData;
  }>(
    '/',
    {
      schema: createUserSchema,
    },
    async (request, reply) => {
      try {
        const { nombre, correo, contrasena, cargoId } = request.body;

        // Verificar que el correo no esté registrado
        const existingUser = await fastify.prisma.usuario.findUnique({
          where: { correo: correo.toLowerCase().trim() },
        });

        if (existingUser) {
          return reply.conflict('El correo ya está registrado');
        }

        // Verificar que el cargo existe
        const cargo = await fastify.prisma.cargo.findUnique({
          where: { id: cargoId },
        });

        if (!cargo) {
          return reply.badRequest('El cargo especificado no existe');
        }

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(contrasena, 10);

        // Crear usuario
        const nuevoUsuario = await fastify.prisma.usuario.create({
          data: {
            nombre,
            correo: correo.toLowerCase().trim(),
            contrasena: hashedPassword,
            cargoId,
            creadoPor: request.currentUser?.id,
          },
          include: {
            cargo: {
              select: {
                id: true,
                nombre: true,
                nivel: true,
              },
            },
          },
        });

        return reply.status(201).send({
          success: true,
          message: 'Usuario creado exitosamente',
          user: {
            id: nuevoUsuario.id,
            nombre: nuevoUsuario.nombre,
            correo: nuevoUsuario.correo,
            cargo: nuevoUsuario.cargo,
            creadoEn: nuevoUsuario.creadoEn,
          },
        });
      } catch (error) {
        fastify.log.error('Error al crear usuario:', error);
        return reply.internalServerError('Error al crear usuario');
      }
    }
  );

  /**
   * POST /users/:id/reset-password - Restablecer contraseña
   */
  fastify.post<{
    Params: { id: number };
  }>(
    '/:id/reset-password',
    {
      schema: resetPasswordSchema,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        // Verificar que el usuario existe
        const usuario = await fastify.prisma.usuario.findUnique({
          where: {
            id,
            eliminadoEn: null,
          },
        });

        if (!usuario) {
          return reply.notFound('Usuario no encontrado');
        }

        // Generar contraseña temporal
        const temporaryPassword = `Pass${randomBytes(4).toString('hex')}!`;
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        // Actualizar contraseña
        await fastify.prisma.usuario.update({
          where: { id },
          data: {
            contrasena: hashedPassword,
          },
        });

        // TODO: Enviar correo con la nueva contraseña
        fastify.log.info(
          `Contraseña restablecida para usuario ${id}: ${temporaryPassword}`
        );

        return reply.send({
          success: true,
          message: 'Contraseña restablecida exitosamente',
          temporaryPassword, // En producción, esto debería enviarse por correo
        });
      } catch (error) {
        fastify.log.error('Error al restablecer contraseña:', error);
        return reply.internalServerError('Error al restablecer contraseña');
      }
    }
  );
};
```

## 8. Crear las rutas - PUT

Crea put.ts:

```typescript
import bcrypt from 'bcrypt';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { UpdateUserData } from '../../models/user';
import { updateUserSchema } from '../../schemas/user';

/**
 * Rutas PUT de usuarios
 */
export const putUsersRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * PUT /users/:id - Actualizar usuario
   */
  fastify.put<{
    Params: { id: number };
    Body: UpdateUserData;
  }>(
    '/:id',
    {
      schema: updateUserSchema,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { nombre, correo, contrasena, cargoId } = request.body;

        // Verificar que el usuario existe
        const usuario = await fastify.prisma.usuario.findUnique({
          where: {
            id,
            eliminadoEn: null,
          },
        });

        if (!usuario) {
          return reply.notFound('Usuario no encontrado');
        }

        // Si se actualiza el correo, verificar que no esté en uso
        if (correo && correo !== usuario.correo) {
          const existingUser = await fastify.prisma.usuario.findUnique({
            where: { correo: correo.toLowerCase().trim() },
          });

          if (existingUser) {
            return reply.conflict('El correo ya está registrado');
          }
        }

        // Si se actualiza el cargo, verificar que existe
        if (cargoId) {
          const cargo = await fastify.prisma.cargo.findUnique({
            where: { id: cargoId },
          });

          if (!cargo) {
            return reply.badRequest('El cargo especificado no existe');
          }
        }

        // Preparar datos para actualizar
        const updateData: {
          nombre?: string;
          correo?: string;
          contrasena?: string;
          cargoId?: number;
        } = {};

        if (nombre) updateData.nombre = nombre;
        if (correo) updateData.correo = correo.toLowerCase().trim();
        if (cargoId) updateData.cargoId = cargoId;
        if (contrasena) {
          updateData.contrasena = await bcrypt.hash(contrasena, 10);
        }

        // Actualizar usuario
        const usuarioActualizado = await fastify.prisma.usuario.update({
          where: { id },
          data: updateData,
          include: {
            cargo: {
              select: {
                id: true,
                nombre: true,
                nivel: true,
              },
            },
          },
        });

        return reply.send({
          success: true,
          message: 'Usuario actualizado exitosamente',
          user: {
            id: usuarioActualizado.id,
            nombre: usuarioActualizado.nombre,
            correo: usuarioActualizado.correo,
            cargo: usuarioActualizado.cargo,
            creadoEn: usuarioActualizado.creadoEn,
          },
        });
      } catch (error) {
        fastify.log.error('Error al actualizar usuario:', error);
        return reply.internalServerError('Error al actualizar usuario');
      }
    }
  );
};
```

## 9. Crear las rutas - DELETE

Crea `src/routes/users/delete.ts`:

```typescript
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { deleteUserSchema } from '../../schemas/user';

/**
 * Rutas DELETE de usuarios
 */
export const deleteUsersRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * DELETE /users/:id - Eliminar usuario (soft delete)
   */
  fastify.delete<{
    Params: { id: number };
  }>(
    '/:id',
    {
      schema: deleteUserSchema,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        // Verificar que el usuario existe y no está eliminado
        const usuario = await fastify.prisma.usuario.findUnique({
          where: {
            id,
            eliminadoEn: null,
          },
        });

        if (!usuario) {
          return reply.notFound('Usuario no encontrado');
        }

        // Evitar auto-eliminación
        if (request.currentUser?.id === id) {
          return reply.badRequest('No puedes eliminar tu propio usuario');
        }

        // Soft delete
        await fastify.prisma.usuario.update({
          where: { id },
          data: {
            eliminadoEn: new Date(),
          },
        });

        return reply.send({
          success: true,
          message: 'Usuario eliminado exitosamente',
        });
      } catch (error) {
        fastify.log.error('Error al eliminar usuario:', error);
        return reply.internalServerError('Error al eliminar usuario');
      }
    }
  );
};
```

## 10. Crear archivo index de rutas

Crea index.ts:

```typescript
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { requireCargoLevel } from '../../middlewares/auth';
import { deleteUsersRoutes } from './delete';
import { getUsersRoutes } from './get';
import { postUsersRoutes } from './post';
import { putUsersRoutes } from './put';

const usersRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Todas las rutas de usuarios requieren nivel 3 o superior (Inspector, Administrador)
  fastify.addHook('preHandler', requireCargoLevel(3));

  // Registrar rutas
  await fastify.register(getUsersRoutes);
  await fastify.register(postUsersRoutes);
  await fastify.register(putUsersRoutes);
  await fastify.register(deleteUsersRoutes);
};

export default usersRoutes;
```

## 11. Registrar las rutas en el servidor

Actualiza server.ts:

```typescript
// ...existing code...
import authRoutes from './routes/auth/index';
import usersRoutes from './routes/users/index';

async function start() {
  try {
    // ...existing code...

    // 12. Rutas con prefijos
    await app.register(authRoutes, { prefix: '/auth' });
    await app.register(usersRoutes, { prefix: '/users' }); // Nueva línea

    // ...existing code...
  }
}
```

## 12. Actualizar el frontend para consumir los endpoints

Actualiza `usuarios.ts`:

```typescript
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
// ...existing code...

export class Usuarios {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/users';

  // ...existing code...

  /**
   * Cargar usuarios desde el backend
   */
  protected async loadUsers(): Promise<void> {
    this.loading.set(true);

    try {
      const response = await fetch(this.baseUrl, {
        credentials: 'include', // Importante para cookies de autenticación
      });

      if (!response.ok) {
        throw new Error('Error al cargar usuarios');
      }

      const data = await response.json();
      this.users.set(data.users);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      // TODO: Mostrar mensaje de error al usuario
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Crear nuevo usuario
   */
  private async createUser(data: CreateUsuarioRequest): Promise<void> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al crear usuario');
      }

      this.closeDialog();
      await this.loadUsers();
    } catch (error) {
      console.error('Error al crear usuario:', error);
      // TODO: Mostrar mensaje de error al usuario
    }
  }

  /**
   * Actualizar usuario existente
   */
  private async updateUser(
    id: number,
    data: UpdateUsuarioRequest
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al actualizar usuario');
      }

      this.closeDialog();
      await this.loadUsers();
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      // TODO: Mostrar mensaje de error al usuario
    }
  }

  /**
   * Confirmar restablecimiento de contraseña
   */
  protected async confirmResetPassword(): Promise<void> {
    const user = this.userToReset();
    if (!user) return;

    try {
      const response = await fetch(
        `${this.baseUrl}/${user.id}/reset-password`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Error al restablecer contraseña');
      }

      const data = await response.json();

      this.showResetConfirm.set(false);
      this.userToReset.set(undefined);

      // TODO: Mostrar toast de éxito
      alert(
        `La contraseña de ${user.nombre} ha sido restablecida a: ${data.temporaryPassword}`
      );
    } catch (error) {
      console.error('Error al restablecer contraseña:', error);
      // TODO: Mostrar mensaje de error al usuario
    }
  }

  /**
   * Confirmar eliminación de usuario
   */
  protected async confirmDeleteUser(): Promise<void> {
    const user = this.userToDelete();
    if (!user) return;

    try {
      const response = await fetch(`${this.baseUrl}/${user.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar usuario');
      }

      this.showDeleteConfirm.set(false);
      this.userToDelete.set(undefined);
      await this.loadUsers();
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      // TODO: Mostrar mensaje de error al usuario
    }
  }
}
```

## Resumen

Has creado:

✅ **6 archivos de schemas** (validación y documentación)
✅ **5 archivos de rutas** (GET, POST, PUT, DELETE, index)
✅ **1 actualización del servidor** (registro de rutas)
✅ **1 actualización del frontend** (consumo de endpoints)

Los endpoints estarán disponibles en:

- `GET /users` - Listar todos los usuarios
- `GET /users/:id` - Obtener un usuario
- `POST /users` - Crear usuario
- `PUT /users/:id` - Actualizar usuario
- `DELETE /users/:id` - Eliminar usuario (soft delete)
- `POST /users/:id/reset-password` - Restablecer contraseña

Todos protegidos con autenticación JWT y requieren **nivel 3 o superior** (Inspector/Administrador).
