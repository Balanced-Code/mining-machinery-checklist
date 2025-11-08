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
      pattern: '^[a-zA-Z0-9._%+-]+@normet\\.com$',
      description: 'Correo electrónico corporativo (debe ser @normet.com)',
      example: 'admin@normet.com',
    },
    contrasena: {
      type: 'string',
      minLength: 8,
      description: 'Contraseña del usuario (mínimo 8 caracteres)',
      example: 'admin123',
    },
  },
} as const;

/**
 * Schema para el body de cambio de contraseña
 */
export const changePasswordBodySchema = {
  type: 'object',
  required: ['currentPassword', 'newPassword', 'confirmPassword'],
  properties: {
    currentPassword: {
      type: 'string',
      minLength: 8,
      description: 'Contraseña actual del usuario (mínimo 8 caracteres)',
      example: 'OldPass123!',
    },
    newPassword: {
      type: 'string',
      minLength: 8,
      pattern:
        '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=[\\]{};:\'"\\\\|,.<>/?]).+$',
      description:
        'Nueva contraseña (mínimo 8 caracteres, debe contener mayúsculas, minúsculas, números y símbolos especiales)',
      example: 'NewPass123!',
    },
    confirmPassword: {
      type: 'string',
      minLength: 8,
      description: 'Confirmación de la nueva contraseña (mínimo 8 caracteres)',
      example: 'NewPass123!',
    },
  },
} as const;
