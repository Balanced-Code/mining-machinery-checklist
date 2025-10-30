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
