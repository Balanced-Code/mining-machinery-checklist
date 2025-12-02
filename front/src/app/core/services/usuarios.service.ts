import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import {
  Cargo,
  CreateUsuarioRequest,
  UpdateUsuarioRequest,
  User,
  UsuarioResponse,
  UsuariosListResponse,
} from '@core/models/user.model';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UsuariosService {
  private readonly http = inject(HttpClient);

  // Signals para estado reactivo
  private usuariosSignal = signal<User[]>([]);
  private loadingSignal = signal(false);
  private totalSignal = signal(0);
  private errorSignal = signal<string | null>(null);

  // Computed signals (solo lectura)
  readonly usuarios = this.usuariosSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly total = this.totalSignal.asReadonly();
  readonly errorMessage = this.errorSignal.asReadonly();
  readonly hasUsuarios = computed(() => this.usuariosSignal().length > 0);

  private readonly baseUrl = '/api';

  /**
   * Obtiene todos los usuarios del sistema
   * @returns Promise que resuelve cuando los datos están cargados
   */
  async getAll(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<UsuariosListResponse>(`${this.baseUrl}/usuarios`)
      );

      if (response?.users) {
        this.usuariosSignal.set(response.users);
        this.totalSignal.set(response.total);
      }
    } catch (err: unknown) {
      this.handleError(err, 'Error al cargar los usuarios');
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Obtiene todos los cargos disponibles
   * @returns Promise con la lista de cargos
   */
  async getCargos(): Promise<Cargo[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<Cargo[]>(`${this.baseUrl}/usuarios/cargos`)
      );
      return response || [];
    } catch (err: unknown) {
      this.handleError(err, 'Error al cargar los cargos');
      return [];
    }
  }

  /**
   * Obtiene un usuario específico por ID
   * @param id ID del usuario
   * @returns Usuario encontrado o null
   */
  async getById(id: number): Promise<User | null> {
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(this.http.get<User>(`${this.baseUrl}/usuarios/${id}`));

      return response || null;
    } catch (err: unknown) {
      this.handleError(err, `Error al obtener el usuario con ID ${id}`);
      return null;
    }
  }

  /**
   * Crea un nuevo usuario
   * @param data Datos del usuario a crear
   * @returns Usuario creado con contraseña generada o null si falla
   */
  async create(data: CreateUsuarioRequest): Promise<{ user: User; password: string } | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<{
          success: boolean;
          message: string;
          user: {
            id: number;
            nombre: string;
            correo: string;
            contrasena: string;
            cargo: string;
          };
        }>(`${this.baseUrl}/usuarios/create`, data)
      );

      if (response?.success && response.user) {
        // Recargar la lista después de crear
        await this.getAll();

        // Buscar el usuario recién creado en la lista actualizada
        const createdUser = this.usuariosSignal().find((u) => u.id === response.user.id);

        if (createdUser) {
          return {
            user: createdUser,
            password: response.user.contrasena,
          };
        }
      }

      return null;
    } catch (err: unknown) {
      this.handleError(err, 'Error al crear el usuario');
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Actualiza un usuario existente
   * @param id ID del usuario a actualizar
   * @param data Datos a actualizar
   * @returns true si se actualizó correctamente, false en caso contrario
   */
  async update(id: number, data: UpdateUsuarioRequest): Promise<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.put<UsuarioResponse>(`${this.baseUrl}/usuarios/${id}`, data)
      );

      if (response?.success) {
        // Recargar la lista después de actualizar
        await this.getAll();
        return true;
      }

      return false;
    } catch (err: unknown) {
      this.handleError(err, 'Error al actualizar el usuario');
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Restablece la contraseña de un usuario
   * @param id ID del usuario
   * @returns Nueva contraseña generada o null si falla
   */
  async resetPassword(id: number): Promise<string | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<{
          success: boolean;
          message: string;
          user: {
            id: number;
            nombre: string;
            correo: string;
            contrasena: string;
            cargo: string;
          };
        }>(`${this.baseUrl}/usuarios/${id}/reset-password`, {})
      );

      if (response?.success && response.user) {
        return response.user.contrasena;
      }

      return null;
    } catch (err: unknown) {
      this.handleError(err, 'Error al restablecer la contraseña');
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Elimina un usuario (soft delete)
   * @param id ID del usuario a eliminar
   * @returns true si se eliminó correctamente, false en caso contrario
   */
  async delete(id: number): Promise<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/usuarios/${id}`)
      );

      if (response?.success) {
        // Recargar la lista después de eliminar
        await this.getAll();
        return true;
      }

      return false;
    } catch (err: unknown) {
      this.handleError(err, 'Error al eliminar el usuario');
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Reactiva un usuario (soft delete inverso)
   * @param id ID del usuario a reactivar
   * @returns true si se reactivó correctamente, false en caso contrario
   */
  async reactivate(id: number): Promise<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; message: string }>(
          `${this.baseUrl}/usuarios/${id}/reactive`,
          {}
        )
      );

      if (response?.success) {
        // Recargar la lista después de reactivar
        await this.getAll();
        return true;
      }

      return false;
    } catch (err: unknown) {
      this.handleError(err, 'Error al reactivar el usuario');
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Maneja errores HTTP y actualiza el signal de error
   * @param err Error capturado
   * @param defaultMessage Mensaje por defecto si no hay mensaje específico
   */
  private handleError(err: unknown, defaultMessage: string): void {
    let message = defaultMessage;

    if (err instanceof HttpErrorResponse) {
      // Extraer mensaje del backend si está disponible
      message = err.error?.message || err.message || message;

      // Log del error completo para debugging
      console.error('Error HTTP:', {
        status: err.status,
        statusText: err.statusText,
        message: message,
        error: err.error,
      });
    } else {
      console.error('Error desconocido:', err);
    }

    this.errorSignal.set(message);
  }
}
