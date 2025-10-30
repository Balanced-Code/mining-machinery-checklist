import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Lógica compartida para validar autenticación y roles
 */
const checkAuthAndRole = (route: ActivatedRouteSnapshot): boolean => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 1. Verificar autenticación
  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // 2. Verificar cargo si está definido en la ruta
  const requiredCargo = route.data['cargo'] as string;
  const requiredLevel = route.data['nivel'] as number;

  // Si no se requiere un cargo o nivel específico, solo requiere autenticación
  if (!requiredCargo && !requiredLevel) {
    return true;
  }

  // 3. Validar jerarquía de cargos
  let hasAccess = false;

  if (requiredCargo) {
    hasAccess = authService.hasRequiredCargo(requiredCargo);
  } else if (requiredLevel) {
    hasAccess = authService.hasRequiredLevel(requiredLevel);
  }

  if (hasAccess) {
    return true;
  } else {
    // Si no cumple, redirigir al dashboard
    console.warn(
      `Acceso denegado. Se requiere cargo '${
        requiredCargo || `nivel ${requiredLevel}`
      }' o superior.`
    );
    router.navigate(['/dashboard']);
    return false;
  }
};

/**
 * Guard para proteger rutas individuales
 */
export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  return checkAuthAndRole(route);
};

/**
 * Guard para proteger rutas hijas automáticamente
 */
export const authChildGuard: CanActivateChildFn = (childRoute: ActivatedRouteSnapshot) => {
  return checkAuthAndRole(childRoute);
};
