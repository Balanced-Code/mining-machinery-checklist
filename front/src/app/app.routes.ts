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
        // Sin restricciones de cargo/nivel - accesible para todos los usuarios autenticados
      },
      // Ejemplo: Ruta solo para supervisores o superior
      // {
      //   path: 'inspecciones',
      //   loadComponent: () =>
      //     import('./pages/inspecciones/inspecciones').then((m) => m.Inspecciones),
      //   data: { cargo: 'supervisor' }, // Solo supervisores, gerentes y administradores
      // },
      // Ejemplo: Ruta solo para nivel 3 o superior (gerente y administrador)
      // {
      //   path: 'reportes',
      //   loadComponent: () =>
      //     import('./pages/reportes/reportes').then((m) => m.Reportes),
      //   data: { nivel: 3 },
      // },
      // Ejemplo: Ruta solo para administradores
      // {
      //   path: 'admin',
      //   loadComponent: () =>
      //     import('./pages/admin/admin').then((m) => m.Admin),
      //   data: { cargo: 'administrador' },
      // },
    ],
  },
  {
    path: '**',
    redirectTo: '/dashboard',
  },
];
