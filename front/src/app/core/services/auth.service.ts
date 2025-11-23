import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  CargosConfig,
  ChangePasswordRequest,
  ChangePasswordResponse,
  LoginRequest,
  LoginResponse,
  User,
} from '@core/models/user.model';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // Signals para estado reactivo
  private currentUserSignal = signal<User | null>(null);
  private isLoadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);

  // Jerarquía de cargos dinámica desde el backend
  private cargosHierarchySignal = signal<Record<string, number>>({});

  // Estado de carga de configuración
  private configLoadedSignal = signal(false);
  private configErrorSignal = signal<string | null>(null);

  // Computed signals (solo lectura)
  readonly user = this.currentUserSignal.asReadonly();
  readonly loading = this.isLoadingSignal.asReadonly();
  readonly errorMessage = this.errorSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  readonly cargosHierarchy = this.cargosHierarchySignal.asReadonly();
  readonly currentCargo = computed(() => this.currentUserSignal()?.cargo);
  readonly configLoaded = this.configLoadedSignal.asReadonly();
  readonly configError = this.configErrorSignal.asReadonly();

  private readonly baseUrl = 'http://localhost:3000';

  constructor() {
    // Los cargos se cargan a través de APP_INITIALIZER antes de que la app arranque
    // Ver app.config.ts
  }
  /**
   * Realiza el login del usuario
   */
  async login(credentials: LoginRequest): Promise<boolean> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, credentials)
      );

      if (response?.success && response.user) {
        this.currentUserSignal.set(response.user);
        this.router.navigate(['/dashboard']);
        return true;
      } else {
        this.errorSignal.set(response?.message || 'Error en el login');
        return false;
      }
    } catch (err: unknown) {
      let message = 'Error de conexión';
      if (err instanceof HttpErrorResponse) {
        message = err.error?.message || err.message || message;
      }
      this.errorSignal.set(message);
      return false;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Cierra la sesión del usuario
   */
  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/auth/logout`, {}));
    } catch (err: unknown) {
      console.error('Error durante logout:', err);
    } finally {
      this.currentUserSignal.set(null);
      this.router.navigate(['/login']);
    }
  }

  /**
   * Cambia la contraseña del usuario autenticado
   * @throws Error con el mensaje específico del backend
   */
  async changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<void> {
    const request: ChangePasswordRequest = {
      currentPassword,
      newPassword,
      confirmPassword,
    };

    try {
      const response = await firstValueFrom(
        this.http.put<ChangePasswordResponse>(`${this.baseUrl}/auth/profile/password`, request)
      );

      if (!response?.success) {
        throw new Error(response?.message || 'Error al cambiar la contraseña');
      }

      // Después de cambiar la contraseña exitosamente, el backend revoca todos los tokens
      // Por lo tanto, debemos limpiar el estado local y redirigir al login
      this.currentUserSignal.set(null);
      this.router.navigate(['/login']);
    } catch (err: unknown) {
      // Manejo específico de errores HTTP del backend
      if (err instanceof HttpErrorResponse) {
        // El backend retorna { error: string, message: string, statusCode: number }
        const backendMessage = err.error?.message;

        // Mapear códigos de estado a mensajes específicos si el backend no provee mensaje
        let errorMessage: string;

        switch (err.status) {
          case 400:
            // Bad Request: validación fallida (contraseñas no coinciden, etc.)
            errorMessage = backendMessage || 'Las contraseñas no cumplen con los requisitos';
            break;
          case 401:
            // Unauthorized: contraseña actual incorrecta o sesión inválida
            errorMessage = backendMessage || 'La contraseña actual es incorrecta';
            break;
          case 404:
            // Not Found: usuario no existe (raro, pero posible)
            errorMessage = backendMessage || 'Usuario no encontrado';
            break;
          case 500:
            // Internal Server Error
            errorMessage = backendMessage || 'Error del servidor. Intenta nuevamente más tarde';
            break;
          case 0:
            // Sin conexión al servidor
            errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión';
            break;
          default:
            errorMessage = backendMessage || `Error inesperado (${err.status})`;
        }

        throw new Error(errorMessage);
      }

      // Si no es HttpErrorResponse, propagar el error original
      throw err;
    }
  }

  /**
   * Verifica el estado de autenticación con el backend
   */
  async checkAuthStatus(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ user: User }>(`${this.baseUrl}/auth/profile/me`)
      );

      if (response?.user) {
        this.currentUserSignal.set(response.user);
      }
    } catch {
      // Si no hay sesión activa, mantener currentUser como null
      this.currentUserSignal.set(null);
    }
  }

  /**
   * Carga la configuración de cargos con sistema de cache
   * Usa localStorage para persistencia y sessionStorage para detectar cierre de navegador
   * Este método es llamado por APP_INITIALIZER en app.config.ts
   */
  async loadCargosConfigWithCache(): Promise<void> {
    this.configLoadedSignal.set(false);
    this.configErrorSignal.set(null);

    const cached = localStorage.getItem('cargos_hierarchy');
    const cacheTime = localStorage.getItem('cargos_cache_time');
    const sessionActive = sessionStorage.getItem('session_active');

    // Verificación estricta: TODOS deben existir para usar cache
    if (cached && cacheTime && sessionActive) {
      const age = Date.now() - parseInt(cacheTime);
      const MAX_AGE = 24 * 60 * 60 * 1000; // 24 horas

      if (age < MAX_AGE) {
        // Todas las condiciones OK, usar cache
        try {
          this.cargosHierarchySignal.set(JSON.parse(cached));
          this.configLoadedSignal.set(true);
          const hoursRemaining = Math.round((MAX_AGE - age) / 1000 / 60 / 60);
          console.log(`Cache válido (navegador abierto, expira en ${hoursRemaining}h)`);
          return;
        } catch (err) {
          console.warn('Error al parsear cache, recargando:', err);
        }
      } else {
        console.log('Cache expirado (>24h), recargando...');
      }
    } else {
      // Diagnóstico de qué falta
      const missing = [];
      if (!cached) missing.push('datos');
      if (!cacheTime) missing.push('timestamp');
      if (!sessionActive) missing.push('sesión');
      console.log(`Recargando cargos (falta: ${missing.join(', ')})`);
    }

    // Alguna condición falló, recargar desde backend
    await this.loadCargosConfig();
    sessionStorage.setItem('session_active', 'true');
  }

  /**
   * Carga la configuración de cargos desde el backend
   */
  private async loadCargosConfig(): Promise<void> {
    const MAX_RETRIES = 3;
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
      try {
        const response = await firstValueFrom(
          this.http.get<CargosConfig>(`${this.baseUrl}/auth/cargos`)
        );

        // Validar que la respuesta tenga datos válidos
        if (response?.hierarchy && Object.keys(response.hierarchy).length > 0) {
          // Validar que todos los niveles sean números positivos o cero
          const isValid = Object.values(response.hierarchy).every(
            (nivel) => typeof nivel === 'number' && nivel >= 0
          );

          if (isValid) {
            this.cargosHierarchySignal.set(response.hierarchy);
            this.configLoadedSignal.set(true);

            // Guardar en localStorage
            localStorage.setItem('cargos_hierarchy', JSON.stringify(response.hierarchy));
            localStorage.setItem('cargos_cache_time', Date.now().toString());

            console.log('Cargos cargados desde backend y guardados en cache');
            return;
          } else {
            console.warn('Jerarquía inválida del backend');
          }
        } else {
          console.warn('Respuesta vacía del backend');
        }

        attempts++;
        if (attempts < MAX_RETRIES) {
          console.warn(`Intento ${attempts}/${MAX_RETRIES} falló, reintentando...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (err: unknown) {
        attempts++;
        if (attempts < MAX_RETRIES) {
          console.error(`Error en intento ${attempts}/${MAX_RETRIES}:`, err);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          console.error('Error al cargar configuración después de 3 intentos:', err);
        }
      }
    }

    // Después de 3 intentos fallidos, usar fallback
    this.configErrorSignal.set('No se pudo cargar la configuración de cargos del servidor');
    this.setFallbackHierarchy();
  }

  /**
   * Establece la jerarquía de cargos por defecto (fallback)
   */
  private setFallbackHierarchy(): void {
    const fallback = {
      invitado: 1,
      operador: 1,
      'tecnico mecanico': 2,
      supervisor: 2,
      inspector: 3,
      administrador: 4,
    };
    this.cargosHierarchySignal.set(fallback);
    this.configLoadedSignal.set(true);
    console.log('Usando jerarquía de cargos por defecto (fallback)');
  }

  /**
   * Forzar recarga de cargos (para administradores)
   * Limpia cache y recarga desde backend
   */
  async refreshCargos(): Promise<void> {
    console.log('Forzando recarga de cargos...');
    localStorage.removeItem('cargos_hierarchy');
    localStorage.removeItem('cargos_cache_time');
    sessionStorage.removeItem('session_active');
    await this.loadCargosConfig();
    sessionStorage.setItem('session_active', 'true');
  }

  /**
   * Comprueba si el cargo del usuario cumple con el nivel mínimo requerido.
   * @param requiredCargo El cargo mínimo necesario (nombre del cargo).
   * @returns `true` si el usuario tiene el nivel de permiso requerido o superior.
   */
  hasRequiredCargo(requiredCargo: string): boolean {
    const user = this.currentUserSignal();
    if (!user || !user.cargo) {
      return false;
    }

    const hierarchy = this.cargosHierarchySignal();
    const userLevel = hierarchy[user.cargo.nombre.toLowerCase()];
    const requiredLevel = hierarchy[requiredCargo.toLowerCase()];

    // Si el cargo requerido o el del usuario no está en la jerarquía, denegar por seguridad.
    if (!userLevel || !requiredLevel) {
      return false;
    }

    return userLevel >= requiredLevel;
  }

  /**
   * Comprueba si el cargo del usuario cumple con el nivel mínimo requerido (por nivel numérico).
   * @param requiredLevel El nivel mínimo necesario.
   * @returns `true` si el usuario tiene el nivel de permiso requerido o superior.
   */
  hasRequiredLevel(requiredLevel: number): boolean {
    const user = this.currentUserSignal();
    if (!user || !user.cargo) {
      return false;
    }

    return user.cargo.nivel >= requiredLevel;
  }

  /**
   * Verifica si el usuario tiene un cargo específico (exacto).
   * @param cargoNombre El nombre del cargo a verificar.
   * @returns `true` si el usuario tiene exactamente ese cargo.
   */
  hasExactCargo(cargoNombre: string): boolean {
    const user = this.currentUserSignal();
    return user?.cargo.nombre.toLowerCase() === cargoNombre.toLowerCase();
  }
}
