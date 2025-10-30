/**
 * Schemas de request para rutas de autenticación
 */

/**
 * Schema para el body de login
 */
export const loginBodySchema = {
  type: 'object',
  required: ['correo', 'contrasena'],
  properties: {
    correo: {
      type: 'string',
      format: 'email',
      description: 'Correo electrónico del usuario',
      example: 'admin@normet.com',
    },
    contrasena: {
      type: 'string',
      minLength: 6,
      description: 'Contraseña del usuario',
      example: 'admin123',
    },
  },
} as const;
