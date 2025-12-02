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
  eliminadoPor: number | null;
  eliminadoEn: string | null;
  maquina?: {
    id: number;
    nombre: string;
  };
  creador?: {
    id: number;
    nombre: string;
    correo: string;
  };
  asignaciones?: Array<{
    id: string;
    inspeccionId: string;
    usuarioId: number;
    rolAsignacionId: number;
    usuario: {
      id: number;
      nombre: string;
      correo: string;
    };
    rolAsignacion: {
      id: number;
      nombre: string;
    };
  }>;
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
   * Nota: No actualiza el estado local. El componente debe llamar a getAll() para refrescar.
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

      return response?.success || false;
    } catch (err: unknown) {
      this.handleError(err, 'Error al eliminar la inspección');
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Reactivar una inspección eliminada (solo admins)
   */
  async reactivate(id: number): Promise<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<{ inspeccion: BackendInspeccion }>(
          `${this.baseUrl}/inspecciones/${id}/reactivar`,
          {}
        )
      );

      if (response?.inspeccion) {
        // Actualizar localmente
        const inspeccionReactivada = this.mapBackendToInspeccion(response.inspeccion);
        this.inspeccionesSignal.update((inspecciones) => {
          const index = inspecciones.findIndex((i) => i.id === id);
          if (index !== -1) {
            // Actualizar existente
            const updated = [...inspecciones];
            updated[index] = inspeccionReactivada;
            return updated;
          }
          // Agregar si no existe
          return [...inspecciones, inspeccionReactivada];
        });
        return true;
      }

      return false;
    } catch (err: unknown) {
      this.handleError(err, 'Error al reactivar la inspección');
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
      eliminadoPor: backend.eliminadoPor ?? undefined,
      eliminadoEn: backend.eliminadoEn ? new Date(backend.eliminadoEn) : undefined,
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
   * Exportar una inspección a Excel (ZIP con Excel + imágenes)
   */
  async exportarExcel(inspeccionId: number): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get(`${this.baseUrl}/inspecciones/${inspeccionId}/export`, {
          responseType: 'blob',
          observe: 'response',
        })
      );

      if (!response.body) {
        throw new Error('No se recibió el archivo');
      }

      // Obtener nombre del archivo desde headers o usar uno por defecto
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `Inspeccion_${inspeccionId}_${this.formatDate(new Date())}.zip`;

      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches?.[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Crear URL del blob y descargar
      const blob = response.body;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();

      // Limpiar
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      this.handleError(err, 'Error al exportar la inspección');
      throw err;
    }
  }

  /**
   * Validar si un número de serie está disponible
   * @param numSerie - Número de serie a validar
   * @param excludeId - ID de inspección a excluir (opcional, para edición)
   * @returns Objeto con información de disponibilidad
   */
  async validarNumeroSerie(
    numSerie: string,
    excludeId?: number
  ): Promise<{
    disponible: boolean;
    eliminado?: boolean;
    message: string;
    detalles?: { maquina?: string };
  }> {
    try {
      const params = excludeId ? { excludeId: excludeId.toString() } : undefined;

      const response = await firstValueFrom(
        this.http.get<{
          disponible: boolean;
          eliminado?: boolean;
          message: string;
          detalles?: { maquina?: string };
        }>(`${this.baseUrl}/inspecciones/validar-num-serie/${numSerie}`, {
          params,
        })
      );

      return response;
    } catch (err: unknown) {
      this.handleError(err, 'Error al validar el número de serie');
      return {
        disponible: false,
        message: 'Error al validar el número de serie',
      };
    }
  }

  /**
   * Formatea una fecha para nombre de archivo YYYYMMDD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
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
