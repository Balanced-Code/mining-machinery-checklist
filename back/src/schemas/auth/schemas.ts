/**
 * Schemas completos para rutas de autenticación
 * Combina request y response schemas
 */

import { loginBodySchema } from './request';
import {
  loginSuccessResponseSchema,
  logoutSuccessResponseSchema,
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
