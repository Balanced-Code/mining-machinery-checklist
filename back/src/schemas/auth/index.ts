/**
 * Barrel export para schemas de autenticación
 */

// Schemas completos (los más usados)
export {
  cargosConfigSchema,
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  profileMeSchema,
} from './schemas';

// Schemas individuales de request
export { changePasswordBodySchema, loginBodySchema } from './request';

// Schemas individuales de response
export {
  cargosConfigResponseSchema,
  changePasswordSuccessResponseSchema,
  loginSuccessResponseSchema,
  logoutSuccessResponseSchema,
  notFoundResponseSchema,
  profileMeResponseSchema,
  unauthorizedResponseSchema,
} from './response';
