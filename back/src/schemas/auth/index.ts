/**
 * Barrel export para schemas de autenticación
 */

// Schemas completos (los más usados)
export {
  cargosConfigSchema,
  loginSchema,
  logoutSchema,
  profileMeSchema,
} from './schemas';

// Schemas individuales de request
export { loginBodySchema } from './request';

// Schemas individuales de response
export {
  cargosConfigResponseSchema,
  loginSuccessResponseSchema,
  logoutSuccessResponseSchema,
  notFoundResponseSchema,
  profileMeResponseSchema,
  unauthorizedResponseSchema,
} from './response';
