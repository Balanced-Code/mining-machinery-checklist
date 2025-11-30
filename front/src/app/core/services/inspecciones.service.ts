import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Inspeccion } from '@core/models/inspeccion.model';
import { firstValueFrom } from 'rxjs';

/**
 * Estructura de una inspección tal como viene del backend
 */
export interface BackendInspeccion {
  id: string;
  fechaInicio: string;
  fechaFinalizacion: string | null;
  maquinaId: number;
  numSerie: string;
  nSerieMotor: string | null;
  cabinado: boolean | null;
  horometro: number | null;
  creadoPor: number;
  creadoEn: string | null;
  maquina?: {
    id: number;
    nombre: string;
  };
  creador?: {
    id: number;
    nombre: string;
    correo: string;
  };
}

/**
 * Respuesta del backend para lista de inspecciones
 */
interface InspeccionesResponse {
  inspecciones: BackendInspeccion[];
  total: number;
}

/**
 * Servicio para gestión de inspecciones
 */
@Injectable({
  providedIn: 'root',
})
export class InspeccionesService {
  private readonly http = inject(HttpClient);

  // Signals para estado reactivo
  private inspeccionesSignal = signal<Inspeccion[]>([]);
  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);

  // Computed signals (solo lectura)
  readonly inspecciones = this.inspeccionesSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly errorMessage = this.errorSignal.asReadonly();
  readonly hasInspecciones = computed(() => this.inspeccionesSignal().length > 0);

  private readonly baseUrl = 'http://localhost:3000';

  /**
   * Obtener todas las inspecciones
   */
  async getAll(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<InspeccionesResponse>(`${this.baseUrl}/inspecciones`)
      );

      if (response?.inspecciones) {
        // Mapear del backend al frontend
        const mappedInspecciones = response.inspecciones.map((insp) =>
          this.mapBackendToInspeccion(insp)
        );
        this.inspeccionesSignal.set(mappedInspecciones);
      }
    } catch (err: unknown) {
      this.handleError(err, 'Error al cargar las inspecciones');
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Eliminar una inspección (soft delete)
   */
  async delete(id: number): Promise<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.delete<{
          success: boolean;
          message: string;
        }>(`${this.baseUrl}/inspecciones/${id}`)
      );

      if (response?.success) {
        // Eliminar localmente
        this.inspeccionesSignal.update((inspecciones) => inspecciones.filter((i) => i.id !== id));
        return true;
      }

      return false;
    } catch (err: unknown) {
      this.handleError(err, 'Error al eliminar la inspección');
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Mapear una inspección del backend al formato del frontend
   */
  private mapBackendToInspeccion(backend: BackendInspeccion): Inspeccion {
    return {
      id: parseInt(backend.id, 10), // BigInt como string → number
      fechaInicio: backend.fechaInicio,
      fechaFinalizacion: backend.fechaFinalizacion,
      maquinaId: backend.maquinaId,
      numSerie: backend.numSerie,
      nSerieMotor: backend.nSerieMotor,
      cabinado: backend.cabinado,
      horometro: backend.horometro,
      creadoPor: backend.creadoPor,
      creadoEn: backend.creadoEn ? new Date(backend.creadoEn) : undefined,
      // Mapear relaciones
      maquina: backend.maquina
        ? {
            id: backend.maquina.id,
            nombre: backend.maquina.nombre,
          }
        : undefined,
      inspector: backend.creador
        ? {
            id: backend.creador.id,
            nombre: backend.creador.nombre,
            correo: backend.creador.correo,
          }
        : undefined,
    };
  }

  /**
   * Maneja errores HTTP y actualiza el signal de error
   */
  private handleError(err: unknown, defaultMessage: string): void {
    let message = defaultMessage;

    if (err instanceof HttpErrorResponse) {
      message = err.error?.message || err.message || message;
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
