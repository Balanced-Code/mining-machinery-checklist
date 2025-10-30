import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor de autenticación que agrega automáticamente
 * withCredentials: true a todas las peticiones HTTP.
 *
 * Esto permite que las cookies HTTP-Only se envíen y reciban
 * automáticamente en todas las peticiones sin necesidad de
 * especificarlo manualmente en cada llamada.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Clonar la petición y agregar withCredentials
  const authReq = req.clone({
    withCredentials: true,
  });

  // Continuar con la petición modificada
  return next(authReq);
};
