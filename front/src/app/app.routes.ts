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
      {
        path: 'usuarios',
        loadComponent: () => import('./pages/usuarios/usuarios').then((m) => m.Usuarios),
        data: {
          title: 'Usuarios',
          description: 'Gestión de usuarios del sistema',
          nivel: 3, // Solo accesible para nivel 3 o superior (Inspector, Administrador)
        },
      },
      {
        path: 'checklist',
        loadComponent: () => import('./pages/checklist/checklist').then((m) => m.Checklist),
        data: {
          title: 'Checklists',
          description: 'Gestiona y supervisa todas las listas de verificación de maquinaria',
        },
        // Accesible para todos los usuarios autenticados (vista limitada según nivel)
      },
      {
        path: 'historial',
        loadComponent: () => import('./pages/historial/historial').then((m) => m.Historial),
        data: {
          title: 'Historial',
          description:
            'Gestiona y supervisa todas las listas de verificación de equipos y maquinaria',
        },
        // Accesible para todos los usuarios autenticados (acciones limitadas según nivel)
      },
      {
        path: 'inspeccion/crear',
        loadComponent: () =>
          import('./pages/inspeccion/crear-inspeccion/crear-inspeccion').then(
            (m) => m.CrearInspeccion
          ),
        data: {
          title: 'Nueva Inspección',
          description: 'Crear una nueva inspección de maquinaria',
          nivel: 2, // Inspector o superior
        },
      },
      {
        path: 'inspeccion/editar/:id',
        loadComponent: () =>
          import('./pages/inspeccion/editar-inspeccion/editar-inspeccion').then(
            (m) => m.EditarInspeccion
          ),
        data: {
          title: 'Editar Inspección',
          description: 'Editar una inspección de maquinaria existente',
          nivel: 2, // Inspector o superior
        },
      },
      {
        path: 'inspeccion/ver/:id',
        loadComponent: () =>
          import('./pages/inspeccion/ver-inspeccion/ver-inspeccion').then((m) => m.VerInspeccion),
        data: {
          title: 'Ver Inspección',
          description: 'Visualizar detalles de una inspección',
        },
      },
    ],
  },
  {
    path: '**',
    redirectTo: '/dashboard',
  },
];
