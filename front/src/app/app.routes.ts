import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { Dashboard } from './pages/dashboard/dashboard';
import { Login } from './pages/login/login';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: Login,
    canActivate: [guestGuard],
  },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard],
    // Ejemplos de protección por cargo o nivel:
    // canActivate: [authGuard],
    // data: { cargo: 'supervisor' }  // Solo supervisores o superior
    // O por nivel numérico:
    // data: { nivel: 2 }  // Solo nivel 2 o superior
  },
  {
    path: '**',
    redirectTo: '/dashboard',
  },
];
