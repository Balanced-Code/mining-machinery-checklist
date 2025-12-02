import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import {
  ChecklistItem,
  ChecklistTemplate,
  UpdateChecklistItemDto,
} from '@core/models/checklist.model';
import { firstValueFrom } from 'rxjs';

/**
 * Respuesta del backend para listar templates
 */
interface BackendTemplate {
  id: number;
  nombre: string;
  secciones: BackendSeccion[];
}

interface BackendSeccion {
  id: number;
  nombre: string;
  orden: number;
}

interface TemplatesListResponse {
  temps: BackendTemplate[];
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class TemplateService {
  private readonly http = inject(HttpClient);

  // Signals para estado reactivo
  private templatesSignal = signal<ChecklistTemplate[]>([]);
  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);

  // Computed signals (solo lectura)
  readonly templates = this.templatesSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly errorMessage = this.errorSignal.asReadonly();
  readonly hasTemplates = computed(() => this.templatesSignal().length > 0);

  private readonly baseUrl = '/api';

  /**
   * Obtiene todos los templates del sistema
   */
  async getAll(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<TemplatesListResponse>(`${this.baseUrl}/templates`)
      );

      if (response?.temps) {
        // Mapear del backend al frontend
        const mappedTemplates = response.temps.map((t) => this.mapBackendToTemplate(t));
        this.templatesSignal.set(mappedTemplates);
      }
    } catch (err: unknown) {
      this.handleError(err, 'Error al cargar los templates');
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Crea un nuevo template
   */
  async create(nombre: string): Promise<ChecklistTemplate | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<{
          success: boolean;
          message: string;
          template: { id: number; nombre: string };
        }>(`${this.baseUrl}/templates/create`, { nombre })
      );

      if (response?.success && response.template) {
        const newTemplate: ChecklistTemplate = {
          id: response.template.id,
          titulo: response.template.nombre,
          items: [],
        };

        // Actualizar la lista local
        this.templatesSignal.update((templates) => [...templates, newTemplate]);

        return newTemplate;
      }

      return null;
    } catch (err: unknown) {
      this.handleError(err, 'Error al crear el template');
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Actualiza un template existente
   */
  async update(id: number, nombre: string): Promise<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.patch<{
          success: boolean;
          message: string;
          template: { id: number; nombre: string };
        }>(`${this.baseUrl}/templates/${id}`, { nombre })
      );

      if (response?.success) {
        // Actualizar localmente
        this.templatesSignal.update((templates) =>
          templates.map((t) => (t.id === id ? { ...t, titulo: nombre } : t))
        );
        return true;
      }

      return false;
    } catch (err: unknown) {
      this.handleError(err, 'Error al actualizar el template');
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Elimina un template
   */
  async delete(id: number): Promise<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.delete<{
          success: boolean;
          message: string;
        }>(`${this.baseUrl}/templates/${id}`)
      );

      if (response?.success) {
        // Eliminar localmente
        this.templatesSignal.update((templates) => templates.filter((t) => t.id !== id));
        return true;
      }

      return false;
    } catch (err: unknown) {
      this.handleError(err, 'Error al eliminar el template');
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Crea una nueva sección en un template
   */
  async createSeccion(
    templateId: number,
    nombre: string,
    orden: number
  ): Promise<ChecklistItem | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<{
          success: boolean;
          message: string;
          seccion: {
            id: number;
            nombre: string;
            templateId: number;
            orden: number;
          };
        }>(`${this.baseUrl}/templates/seccion/create`, {
          template_id: templateId,
          nombre,
          orden,
        })
      );

      if (response?.success && response.seccion) {
        const newItem: ChecklistItem = {
          id: response.seccion.id,
          orden: response.seccion.orden,
          descripcion: response.seccion.nombre, //! Revisar por que descripcion
          checklistTemplateId: response.seccion.templateId,
        };

        // Actualizar el template localmente
        this.templatesSignal.update((templates) =>
          templates.map((t) => (t.id === templateId ? { ...t, items: [...t.items, newItem] } : t))
        );

        return newItem;
      }

      return null;
    } catch (err: unknown) {
      this.handleError(err, 'Error al crear la sección');
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Actualiza una sección existente
   */
  async updateSeccion(
    seccionId: number,
    templateId: number,
    data: UpdateChecklistItemDto
  ): Promise<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const requestBody: { nombre?: string; orden?: number } = {};
      if (data.descripcion !== undefined) {
        requestBody.nombre = data.descripcion;
      }
      if (data.orden !== undefined) {
        requestBody.orden = data.orden;
      }

      const response = await firstValueFrom(
        this.http.patch<{
          success: boolean;
          message: string;
          seccion: {
            id: number;
            nombre: string;
            templateId: number;
            orden: number;
          };
        }>(`${this.baseUrl}/templates/seccion/${seccionId}`, requestBody)
      );

      if (response?.success && response.seccion) {
        // Actualizar localmente
        this.templatesSignal.update((templates) =>
          templates.map((t) =>
            t.id === templateId
              ? {
                  ...t,
                  items: t.items.map((item) =>
                    item.id === seccionId
                      ? {
                          ...item,
                          descripcion: response.seccion.nombre,
                          orden: response.seccion.orden,
                        }
                      : item
                  ),
                }
              : t
          )
        );
        return true;
      }

      return false;
    } catch (err: unknown) {
      this.handleError(err, 'Error al actualizar la sección');
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Elimina una sección
   */
  async deleteSeccion(seccionId: number, templateId: number): Promise<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.delete<{
          success: boolean;
          message: string;
        }>(`${this.baseUrl}/templates/seccion/${seccionId}`)
      );

      if (response?.success) {
        // Eliminar localmente y reordenar
        this.templatesSignal.update((templates) =>
          templates.map((t) => {
            if (t.id === templateId) {
              const newItems = t.items
                .filter((item) => item.id !== seccionId)
                .map((item, index) => ({ ...item, orden: index + 1 }));
              return { ...t, items: newItems };
            }
            return t;
          })
        );
        return true;
      }

      return false;
    } catch (err: unknown) {
      this.handleError(err, 'Error al eliminar la sección');
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Mapea un template del backend al formato del frontend
   */
  private mapBackendToTemplate(backend: BackendTemplate): ChecklistTemplate {
    return {
      id: backend.id,
      titulo: backend.nombre,
      items: backend.secciones.map((s) => ({
        id: s.id,
        orden: s.orden,
        descripcion: s.nombre,
        checklistTemplateId: backend.id,
      })),
    };
  }

  /**
   * Maneja errores HTTP y actualiza el signal de error
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

  /**
   * Reordena múltiples secciones de forma atómica
   */
  async reorderSecciones(
    templateId: number,
    secciones: Array<{ id: number; orden: number }>
  ): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      await firstValueFrom(
        this.http.patch<{
          success: boolean;
          message: string;
        }>(`${this.baseUrl}/templates/${templateId}/reorder`, { secciones })
      );
    } catch (err: unknown) {
      this.handleError(err, 'Error al reordenar secciones');
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
