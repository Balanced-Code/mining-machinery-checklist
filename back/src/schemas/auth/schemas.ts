/**
 * Schemas completos para rutas de autenticación
 * Combina request y response schemas
 */

import { loginBodySchema } from './request';
import {
  cargosConfigResponseSchema,
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
