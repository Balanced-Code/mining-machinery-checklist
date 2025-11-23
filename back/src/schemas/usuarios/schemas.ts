import {
  createUsuarioBodySchema,
  updateUsuarioBodySchema,
  usuarioIdParamSchema,
} from './request';
import {
  deleteUsuarioResponseSchema,
  resetPasswordResponseSchema,
  updateUsuarioOperationResponseSchema,
  usuariosListaResponseSchema,
  usuarioVistaSchema,
  cargosListResponseSchema,
} from './response';

/**
 * Schema para GET /usuarios - Lista de Usuarios
 */
export const getUsuariosSchema = {
  description: 'Obtener lista de usuarios',
  tags: ['Usuarios'],
  response: {
    200: usuariosListaResponseSchema,
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
 * Schema para GET /usuarios/:id - Visualizar un Usuario en concreto por ID
 */
export const getUsuarioByIdSchema = {
  description: 'Obtener usuario por ID',
  tags: ['Usuarios'],
  params: usuarioIdParamSchema,
  response: {
    200: usuarioVistaSchema,
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
 * Schema para POST /usuarios - Crear un nuevo Usuario
 */
export const createUsuarioSchema = {
  description: 'Crear un nuevo usuario',
  tags: ['Usuarios'],
  body: createUsuarioBodySchema,
  response: {
    201: updateUsuarioOperationResponseSchema,
    400: {
      description: 'Datos inválidos',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    409: {
      description: 'Conflicto al crear el usuario',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
} as const;

/**
 * Schema para PUT /usuarios/:id - Actualizar un Usuario existente
 */
export const updateUsuarioSchema = {
  description: 'Actualizar un usuario existente',
  tags: ['Usuarios'],
  params: usuarioIdParamSchema,
  body: updateUsuarioBodySchema,
  response: {
    200: updateUsuarioOperationResponseSchema,
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
 * Schema para DELETE /usuarios/:id - Eliminar un Usuario
 */
export const deleteUsuarioSchema = {
  description: 'Eliminar usuario (soft delete)',
  tags: ['Usuarios'],
  params: usuarioIdParamSchema,
  response: {
    200: deleteUsuarioResponseSchema,
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
 * Schema para POST /usuarios/:id/reset-password - Resetear la contraseña de un Usuario con una contraseña temporal
 */
export const resetPasswordSchema = {
  description: 'Restablecer la contraseña de un usuario',
  tags: ['Usuarios'],
  params: usuarioIdParamSchema,
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

/**
 * Schema para GET /usuarios/cargos - Lista de Cargos
 */
export const getCargosSchema = {
  description: 'Obtener lista de cargos disponibles',
  tags: ['Usuarios'],
  response: {
    200: cargosListResponseSchema,
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
