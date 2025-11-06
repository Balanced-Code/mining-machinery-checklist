import { Routes } from '@angular/router';
import { authChildGuard, authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    canActivate: [guestGuard], // Solo accesible si NO está autenticado
  },
  {
    path: '',
    loadComponent: () => import('./shared/components/layout/layout').then((m) => m.Layout),
    canActivate: [authGuard], // Verifica autenticación para el layout
    canActivateChild: [authChildGuard], // Verifica roles para cada ruta hija automáticamente
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
        data: {
          title: 'Dashboard',
          description: 'Bienvenido al sistema de gestión de checklist',
        },
        // Sin restricciones de cargo/nivel - accesible para todos los usuarios autenticados
      },
      {
        path: 'perfil',
        loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
        data: {
          title: 'Mi Perfil',
          description: 'Gestiona tu información personal y configuración de cuenta',
        },
        // Accesible para todos los usuarios autenticados
      },
    ],
  },
  {
    path: '**',
    redirectTo: '/dashboard',
  },
];
