import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface Maquina {
  id: number;
  nombre: string;
  _count?: {
    inspecciones: number;
  };
}

interface MaquinaResponse {
  success: boolean;
  message: string;
  maquina: Maquina;
}

@Injectable({
  providedIn: 'root',
})
export class MaquinariaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '';
  private readonly apiUrl = `${this.baseUrl}/maquinas`;

  // Estados
  readonly maquinas = signal<Maquina[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * Obtener todas las máquinas
   */
  async obtenerMaquinas(): Promise<Maquina[]> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const maquinas = await firstValueFrom(this.http.get<Maquina[]>(this.apiUrl));
      this.maquinas.set(maquinas);
      return maquinas;
    } catch (error) {
      this.handleError(error);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Crear una nueva máquina
   */
  async crearMaquina(nombre: string): Promise<Maquina | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<MaquinaResponse>(this.apiUrl, { nombre })
      );

      // Actualizar la lista local
      await this.obtenerMaquinas();

      return response.maquina;
    } catch (error) {
      this.handleError(error);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Actualizar una máquina existente
   */
  async actualizarMaquina(id: number, nombre: string): Promise<Maquina | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.put<MaquinaResponse>(`${this.apiUrl}/${id}`, { nombre })
      );

      // Actualizar la lista local
      await this.obtenerMaquinas();

      return response.maquina;
    } catch (error) {
      this.handleError(error);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Eliminar una máquina (soft delete)
   */
  async eliminarMaquina(id: number): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);

    try {
      await firstValueFrom(this.http.delete(`${this.apiUrl}/${id}`));

      // Actualizar la lista local
      await this.obtenerMaquinas();

      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Limpiar el error actual
   */
  limpiarError(): void {
    this.error.set(null);
  }

  /**
   * Manejo centralizado de errores
   */
  private handleError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      // Error del servidor
      if (error.status === 409) {
        this.error.set(error.error.message || 'Conflicto al procesar la solicitud');
      } else if (error.status === 404) {
        this.error.set('Máquina no encontrada');
      } else if (error.status === 400) {
        this.error.set('Datos inválidos');
      } else if (error.status >= 500) {
        this.error.set('Error del servidor. Por favor, intenta más tarde');
      } else {
        this.error.set(error.error?.message || 'Error al procesar la solicitud');
      }
    } else {
      // Error del cliente
      this.error.set('Error de conexión. Por favor, verifica tu conexión a internet');
    }
  }
}
