/**
 * Schemas de response para rutas de autenticación
 */

/**
 * Schema de respuesta exitosa de login (200)
 */
export const loginSuccessResponseSchema = {
  description: 'Login exitoso',
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    user: {
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
      },
    },
  },
} as const;

/**
 * Schema de respuesta de error 401 (no autorizado)
 */
export const unauthorizedResponseSchema = {
  description: 'Credenciales inválidas',
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
    statusCode: { type: 'number' },
  },
} as const;

/**
 * Schema de respuesta exitosa de logout (200)
 */
export const logoutSuccessResponseSchema = {
  description: 'Logout exitoso',
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
} as const;

/**
 * Schema de respuesta de configuración de cargos (200)
 */
export const cargosConfigResponseSchema = {
  description: 'Configuración de jerarquía de cargos',
  type: 'object',
  properties: {
    hierarchy: {
      type: 'object',
      additionalProperties: { type: 'number' },
      description: 'Mapa de nombre de cargo a nivel jerárquico',
      examples: [
        {
          invitado: 1,
          operador: 1,
          'tecnico mecanico': 2,
          supervisor: 2,
          inspector: 3,
          administrador: 4,
        },
      ],
    },
  },
  required: ['hierarchy'],
} as const;

/**
 * Schema de respuesta de perfil de usuario (200)
 */
export const profileMeResponseSchema = {
  description: 'Perfil del usuario autenticado',
  type: 'object',
  properties: {
    user: {
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
          required: ['id', 'nombre', 'nivel'],
        },
      },
      required: ['id', 'nombre', 'correo', 'cargo'],
    },
  },
  required: ['user'],
} as const;

/**
 * Schema de respuesta de error 404 (no encontrado)
 */
export const notFoundResponseSchema = {
  description: 'Recurso no encontrado',
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
    statusCode: { type: 'number' },
  },
} as const;
