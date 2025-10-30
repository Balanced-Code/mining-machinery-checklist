import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CargosConfig, LoginRequest, LoginResponse, User } from '../models/user.model';

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

  // 👇 Jerarquía de cargos dinámica desde el backend
  private cargosHierarchySignal = signal<Record<string, number>>({});

  // Computed signals (solo lectura)
  readonly user = this.currentUserSignal.asReadonly();
  readonly loading = this.isLoadingSignal.asReadonly();
  readonly errorMessage = this.errorSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  readonly cargosHierarchy = this.cargosHierarchySignal.asReadonly();
  readonly currentCargo = computed(() => this.currentUserSignal()?.cargo);

  private readonly baseUrl = 'http://localhost:3000';

  constructor() {
    // Cargar cargos al inicializar el servicio
    this.loadCargosConfig();
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
   * Carga la configuración de cargos desde el backend
   */
  private async loadCargosConfig(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<CargosConfig>(`${this.baseUrl}/auth/cargos`)
      );

      if (response?.hierarchy) {
        this.cargosHierarchySignal.set(response.hierarchy);
      }
    } catch (err: unknown) {
      console.error('Error al cargar configuración de cargos:', err);
      // Fallback: cargos por defecto si el backend no responde
      this.cargosHierarchySignal.set({
        operador: 1,
        supervisor: 2,
        gerente: 3,
        administrador: 4,
      });
    }
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
