import {
  CORREO_EMPRESA_PATTERN,
  NOMBRE_PATTERN,
  PASSWORD_SEGURO_PATTERN,
} from '@/schemas/common/patterns';

/**
 * Schemas para crear usuarios
 */
export const createUsuarioBodySchema = {
  type: 'object',
  required: ['nombre', 'correo', 'cargoId'],
  properties: {
    nombre: {
      type: 'string',
      minLenght: 3,
      maxLength: 80,
      pattern: NOMBRE_PATTERN,
    },
    correo: {
      type: 'string',
      format: 'email',
      pattern: CORREO_EMPRESA_PATTERN,
    },
    cargoId: {
      type: 'number',
      minimum: 1,
    },
  },
} as const;

/**
 * Schemas para actualizar usuarios
 */
export const updateUsusarioBodySchema = {
  type: 'object',
  required: ['nombre', 'correo', 'contrasena', 'cargoId'],
  properties: {
    nombre: {
      type: 'string',
      minLenght: 3,
      maxLength: 80,
      pattern: NOMBRE_PATTERN,
    },
    correo: {},
    contrasena: {
      type: 'string',
      format: 'password',
      minLength: 8,
      pattern: PASSWORD_SEGURO_PATTERN,
    },
    cargoId: {
      type: 'number',
      minimum: 1,
    },
  },
} as const;

/**
 * Schemas para identificar usuarios por ID en parámetros de ruta
 */
export const usuarioIdParamSchema = {
  type: 'object',
  required: ['userId'],
  properties: {
    userId: {
      type: 'number',
      minimum: 1,
    },
  },
} as const;
