/**
 * Schemas de usuario (admin)
 */
export const usuarioVistaSchema = {
  type: 'object',
  required: ['id', 'nombre', 'correo', 'cargo', 'eliminadoEn'],
  properties: {
    id: { type: 'number' },
    nombre: { type: 'string' },
    correo: {
      type: 'string',
      format: 'email',
    },
    cargo: {
      type: 'object',
      required: ['id', 'nombre', 'nivel'],
      properties: {
        id: { type: 'number' },
        nombre: { type: 'string' },
        nivel: { type: 'number' },
      },
    },
    eliminadoEn: { type: 'string', format: 'date-time', nullable: true },
  },
} as const;

export const usuarioUpdateSchema = {
  type: 'object',
  required: ['id', 'nombre', 'cargo'],
  properties: {
    id: { type: 'number' },
    nombre: { type: 'string' },
    correo: {
      type: 'string',
      format: 'email',
    },
    contrasena: { type: 'string' },
    cargo: {
      type: 'object',
      required: ['nombre'],
      properties: {
        nombre: { type: 'string' },
      },
    },
  },
} as const;

/**
 *  Schema de lista de usuarios
 */
export const usuariosListaResponseSchema = {
  description: 'Lista de usuarios del sistema',
  type: 'object',
  required: ['users', 'total'],
  properties: {
    users: {
      type: 'array',
      items: usuarioVistaSchema,
    },
    total: { type: 'number' },
  },
} as const;

/**
 * Schema de respuesta de Creacion/Actualización = Operación
 */
export const usuarioOperationResponseSchema = {
  description: 'Operación exitosa',
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    user: usuarioVistaSchema,
  },
} as const;

export const updateUsuarioOperationResponseSchema = {
  description: 'Usuario actualizado',
  type: 'object',
  required: ['success', 'message', 'user'],
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    user: usuarioUpdateSchema,
  },
} as const;

/**
 * Schema de respuesta de eliminación
 */
export const deleteUsuarioResponseSchema = {
  description: 'Usuario eliminado',
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
} as const;

/**
 * Schema de respuesta de reset de contraseña con una temporal
 */
export const resetPasswordResponseSchema = {
  description: 'Contraseña restablecida',
  type: 'object',
  required: ['success', 'message', 'user'],
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    user: usuarioUpdateSchema,
  },
} as const;

/**
 * Schema de lista de cargos
 */
export const cargosListResponseSchema = {
  description: 'Lista de cargos disponibles',
  type: 'array',
  items: {
    type: 'object',
    required: ['id', 'nombre', 'nivel'],
    properties: {
      id: { type: 'number' },
      nombre: { type: 'string' },
      nivel: { type: 'number' },
    },
  },
} as const;

export const reactiveUsuarioResponseSchema = {
  description: 'Usuario reactivado',
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    user: usuarioUpdateSchema,
  },
} as const;
