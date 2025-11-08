import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import Aura from '@primeng/themes/aura';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: false,
          cssLayer: {
            name: 'primeng',
            order: 'tailwind-base, primeng, tailwind-utilities',
          },
        },
      },
    }),
    // Cargar configuración de cargos ANTES de iniciar la aplicación
    provideAppInitializer(async () => {
      const authService = inject(AuthService);
      try {
        console.log('Inicializando configuración de cargos...');
        await authService.loadCargosConfigWithCache();
        console.log('nfiguración de cargos cargada');
      } catch (error) {
        console.error('ror al cargar configuración de cargos:', error);
      }
    }),
    // Verificar estado de autenticación del usuario
    provideAppInitializer(async () => {
      const authService = inject(AuthService);
      try {
        await authService.checkAuthStatus();
      } catch (error) {
        console.error('Error al verificar estado de autenticación:', error);
      }
    }),
  ],
};
