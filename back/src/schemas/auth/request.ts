import {
  CORREO_EMPRESA_PATTERN,
  PASSWORD_SEGURO_PATTERN,
} from '@/schemas/common/patterns';

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
      pattern: CORREO_EMPRESA_PATTERN,
      description: 'Correo electrónico corporativo (debe ser @normet.com)',
      example: 'admin@normet.com',
    },
    contrasena: {
      type: 'string',
      format: 'password',
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
      format: 'password',
      minLength: 8,
      pattern: PASSWORD_SEGURO_PATTERN,
      description: 'Contraseña actual del usuario (mínimo 8 caracteres)',
      example: 'OldPass123!',
    },
    newPassword: {
      type: 'string',
      format: 'password',
      minLength: 8,
      pattern: PASSWORD_SEGURO_PATTERN,
      description:
        'Nueva contraseña (mínimo 8 caracteres, debe contener mayúsculas, minúsculas, números y símbolos especiales)',
      example: 'NewPass123!',
    },
    confirmPassword: {
      type: 'string',
      format: 'password',
      minLength: 8,
      pattern: PASSWORD_SEGURO_PATTERN,
      description: 'Confirmación de la nueva contraseña (mínimo 8 caracteres)',
      example: 'NewPass123!',
    },
  },
} as const;
