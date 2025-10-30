/**
 * Barrel export para schemas de autenticación
 */

// Schemas completos (los más usados)
export { loginSchema, logoutSchema } from './schemas';

// Schemas individuales de request
export { loginBodySchema } from './request';

// Schemas individuales de response
export {
  loginSuccessResponseSchema,
  logoutSuccessResponseSchema,
  unauthorizedResponseSchema,
} from './response';
