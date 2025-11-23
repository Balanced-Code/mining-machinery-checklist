import {
  CORREO_EMPRESA_PATTERN,
  NOMBRE_PATTERN,
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
      minLength: 3,
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
 * Todos los campos son opcionales para permitir actualizaciones parciales
 */
export const updateUsuarioBodySchema = {
  type: 'object',
  properties: {
    nombre: {
      type: 'string',
      minLength: 3,
      maxLength: 80,
      pattern: NOMBRE_PATTERN,
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
  required: ['id'],
  properties: {
    id: {
      type: 'number',
      minimum: 1,
    },
  },
} as const;
