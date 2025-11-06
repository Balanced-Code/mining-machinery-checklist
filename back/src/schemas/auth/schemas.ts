/**
 * Schemas completos para rutas de autenticación
 * Combina request y response schemas
 */

import { changePasswordBodySchema, loginBodySchema } from './request';
import {
  cargosConfigResponseSchema,
  changePasswordSuccessResponseSchema,
  loginSuccessResponseSchema,
  logoutSuccessResponseSchema,
  notFoundResponseSchema,
  profileMeResponseSchema,
  unauthorizedResponseSchema,
} from './response';

/**
 * Schema completo para POST /auth/login
 */
export const loginSchema = {
  description: 'Iniciar sesión con correo y contraseña',
  tags: ['Auth'],
  body: loginBodySchema,
  response: {
    200: loginSuccessResponseSchema,
    401: unauthorizedResponseSchema,
  },
} as const;

/**
 * Schema completo para POST /auth/logout
 */
export const logoutSchema = {
  description: 'Cerrar sesión del usuario actual',
  tags: ['Auth'],
  response: {
    200: logoutSuccessResponseSchema,
    401: unauthorizedResponseSchema,
  },
} as const;

/**
 * Schema completo para GET /auth/cargos
 */
export const cargosConfigSchema = {
  description: 'Obtener jerarquía de cargos del sistema',
  tags: ['Auth'],
  response: {
    200: cargosConfigResponseSchema,
  },
} as const;

/**
 * Schema completo para GET /auth/profile/me
 */
export const profileMeSchema = {
  description: 'Obtener perfil del usuario autenticado',
  tags: ['Auth'],
  response: {
    200: profileMeResponseSchema,
    401: unauthorizedResponseSchema,
    404: notFoundResponseSchema,
  },
} as const;

/**
 * Schema completo para PUT /auth/profile/password
 */
export const changePasswordSchema = {
  description: 'Cambiar contraseña del usuario autenticado',
  tags: ['Auth'],
  body: changePasswordBodySchema,
  response: {
    200: changePasswordSuccessResponseSchema,
    400: {
      description: 'Validación fallida (contraseñas no coinciden, etc.)',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
        statusCode: { type: 'number' },
      },
    },
    401: unauthorizedResponseSchema,
  },
} as const;
