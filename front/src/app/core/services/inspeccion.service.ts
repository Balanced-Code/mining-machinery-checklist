import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { ChecklistTemplate } from '../models/checklist.model';
import {
  Inspeccion,
  InspeccionChecklistDTO,
  InspeccionFormDTO,
  InspeccionItemDTO,
  Maquina,
  RespuestaItemDTO,
  ResumenInspeccion,
  UsuarioInspeccion,
} from '../models/inspeccion.model';

@Injectable({
  providedIn: 'root',
})
export class InspeccionService {
  private readonly http = inject(HttpClient);

  // Signals para estado reactivo
  private readonly currentInspeccionSignal = signal<Inspeccion | null>(null);
  private readonly checklistsSignal = signal<InspeccionChecklistDTO[]>([]);
  private readonly isLoadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  // Computed signals (solo lectura)
  readonly currentInspeccion = this.currentInspeccionSignal.asReadonly();
  readonly checklists = this.checklistsSignal.asReadonly();
  readonly loading = this.isLoadingSignal.asReadonly();
  readonly errorMessage = this.errorSignal.asReadonly();

  // Resumen de progreso computado
  readonly resumen = computed<ResumenInspeccion>(() => {
    const checklists = this.checklistsSignal();
    let totalItems = 0;
    let itemsSI = 0;
    let itemsNO = 0;
    let itemsNA = 0;
    let itemsIncompletos = 0;

    checklists.forEach((checklist) => {
      checklist.items.forEach((item) => {
        totalItems++;
        if (item.cumple === true) {
          itemsSI++;
        } else if (item.cumple === false) {
          itemsNO++;
        } else if (item.cumple === null && item.eleccionRespuestaId) {
          // null pero con respuesta = N/A
          itemsNA++;
        } else {
          itemsIncompletos++;
        }
      });
    });

    const porcentajeCompletado =
      totalItems > 0 ? ((totalItems - itemsIncompletos) / totalItems) * 100 : 0;
    const completado = itemsIncompletos === 0 && totalItems > 0;

    return {
      totalItems,
      itemsSI,
      itemsNO,
      itemsNA,
      itemsIncompletos,
      porcentajeCompletado,
      completado,
    };
  });

  private readonly baseUrl = 'http://localhost:3000';

  /**
   * Crea una nueva inspección
   */
  async crear(data: InspeccionFormDTO): Promise<Inspeccion | null> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      // TODO: Cuando el backend esté listo, usar el endpoint real
      // const response = await firstValueFrom(
      //   this.http.post<Inspeccion>(`${this.baseUrl}/inspecciones`, data)
      // );

      // Mock: Simular creación
      const mockInspeccion: Inspeccion = {
        id: Date.now(),
        fechaInicio: new Date().toISOString(),
        fechaFinalizacion: null,
        maquinaId: data.maquinaId,
        numSerie: data.numSerie,
        nSerieMotor: data.nSerieMotor || null,
        cabinado: data.cabinado || null,
        horometro: data.horometro || null,
        creadoPor: 1, // Mock: ID del usuario actual
        creadoEn: new Date(),
      };

      this.currentInspeccionSignal.set(mockInspeccion);
      return mockInspeccion;
    } catch (err: unknown) {
      this.handleError(err, 'Error al crear la inspección');
      return null;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Obtiene una inspección por ID
   */
  async obtenerPorId(id: number): Promise<Inspeccion | null> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      // TODO: Cuando el backend esté listo
      // const response = await firstValueFrom(
      //   this.http.get<Inspeccion>(`${this.baseUrl}/inspecciones/${id}`)
      // );

      // Mock: Simular obtención
      const mockInspeccion: Inspeccion = {
        id: id,
        fechaInicio: '2025-01-19T08:00:00',
        fechaFinalizacion: null,
        maquinaId: 1,
        numSerie: 'EQA-0332',
        nSerieMotor: 'MOT-123',
        cabinado: true,
        horometro: 1200.5,
        creadoPor: 1,
        creadoEn: new Date('2025-01-19T08:00:00'),
        maquina: { id: 1, nombre: 'VOLVO L90H' },
      };

      this.currentInspeccionSignal.set(mockInspeccion);
      return mockInspeccion;
    } catch (err: unknown) {
      this.handleError(err, 'Error al obtener la inspección');
      return null;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Actualiza una inspección existente
   */
  async actualizar(id: number, data: Partial<InspeccionFormDTO>): Promise<boolean> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      // TODO: Cuando el backend esté listo
      // await firstValueFrom(
      //   this.http.patch<Inspeccion>(`${this.baseUrl}/inspecciones/${id}`, data)
      // );

      // Mock: Simular actualización
      const current = this.currentInspeccionSignal();
      if (current && current.id === id) {
        this.currentInspeccionSignal.set({
          ...current,
          numSerie: data.numSerie ?? current.numSerie,
          maquinaId: data.maquinaId ?? current.maquinaId,
          nSerieMotor: data.nSerieMotor ?? current.nSerieMotor,
          cabinado: data.cabinado ?? current.cabinado,
          horometro: data.horometro ?? current.horometro,
          actualizadoEn: new Date(),
        });
      }

      return true;
    } catch (err: unknown) {
      this.handleError(err, 'Error al actualizar la inspección');
      return false;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Termina una inspección (establece fecha de finalización)
   */
  async terminar(id: number): Promise<boolean> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      // Validar que todos los ítems estén completos
      const resumen = this.resumen();
      if (!resumen.completado) {
        this.errorSignal.set(`Faltan ${resumen.itemsIncompletos} ítems por completar`);
        return false;
      }

      // TODO: Cuando el backend esté listo
      // await firstValueFrom(
      //   this.http.post(`${this.baseUrl}/inspecciones/${id}/terminar`, {})
      // );

      // Mock: Simular finalización
      const current = this.currentInspeccionSignal();
      if (current && current.id === id) {
        this.currentInspeccionSignal.set({
          ...current,
          fechaFinalizacion: new Date().toISOString(),
          actualizadoEn: new Date(),
        });
      }

      return true;
    } catch (err: unknown) {
      this.handleError(err, 'Error al terminar la inspección');
      return false;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Elimina (soft delete) una inspección
   */
  async eliminar(id: number): Promise<boolean> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      // TODO: Cuando el backend esté listo
      // await firstValueFrom(
      //   this.http.delete(`${this.baseUrl}/inspecciones/${id}`)
      // );

      // Mock: Limpiar estado
      if (this.currentInspeccionSignal()?.id === id) {
        this.currentInspeccionSignal.set(null);
        this.checklistsSignal.set([]);
      }

      return true;
    } catch (err: unknown) {
      this.handleError(err, 'Error al eliminar la inspección');
      return false;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Agrega un placeholder para un nuevo checklist a la inspección
   */
  agregarChecklistPlaceholder(): void {
    const placeholder: InspeccionChecklistDTO = {
      templateId: -Date.now(), // ID temporal negativo para identificarlo
      nombreTemplate: '',
      items: [],
      completado: false,
      progresoSI: 0,
      progresoNO: 0,
      progresoNA: 0,
      progresoTotal: 0,
    };
    this.checklistsSignal.update((checklists) => [...checklists, placeholder]);
  }

  /**
   * Reemplaza un checklist (placeholder o existente) en un índice específico
   */
  async reemplazarChecklist(index: number, template: ChecklistTemplate): Promise<boolean> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);
    try {
      const items: InspeccionItemDTO[] = template.items.map((item) => ({
        templateSeccionId: item.id,
        orden: item.orden,
        descripcion: item.descripcion,
        cumple: null,
      }));

      const nuevoChecklist: InspeccionChecklistDTO = {
        eleccionTemplateId: undefined,
        templateId: template.id,
        nombreTemplate: template.titulo,
        items,
        completado: false,
        progresoSI: 0,
        progresoNO: 0,
        progresoNA: 0,
        progresoTotal: items.length,
      };

      this.checklistsSignal.update((checklists) => {
        const newChecklists = [...checklists];
        newChecklists[index] = nuevoChecklist;
        return newChecklists;
      });
      return true;
    } catch (err) {
      this.handleError(err, 'Error al reemplazar el checklist');
      return false;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Elimina un checklist de la inspección por su índice
   */
  async eliminarChecklist(index: number): Promise<boolean> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      this.checklistsSignal.update((checklists) => checklists.filter((_, i) => i !== index));
      return true;
    } catch (err: unknown) {
      this.handleError(err, 'Error al eliminar el checklist');
      return false;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Guarda la respuesta a un ítem del checklist
   * Guardado automático - se llama cada vez que cambia una respuesta
   */
  async guardarRespuesta(templateId: number, respuesta: RespuestaItemDTO): Promise<boolean> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      // TODO: Cuando el backend esté listo
      // await firstValueFrom(
      //   this.http.post(
      //     `${this.baseUrl}/inspecciones/respuestas`,
      //     {
      //       templateId,
      //       ...respuesta
      //     }
      //   )
      // );

      // Mock: Actualizar localmente
      this.checklistsSignal.update((checklists) =>
        checklists.map((checklist) => {
          if (checklist.templateId === templateId) {
            const items = checklist.items.map((item) => {
              if (item.templateSeccionId === respuesta.templateSeccionId) {
                return {
                  ...item,
                  cumple: respuesta.cumple,
                  observacion: respuesta.observacion
                    ? {
                        id: respuesta.observacion.id || Date.now(),
                        descripcion: respuesta.observacion.descripcion,
                        archivos: respuesta.observacion.archivosExistentes || [],
                      }
                    : undefined,
                  eleccionRespuestaId: item.eleccionRespuestaId || Date.now(),
                  resultadoId: item.resultadoId || Date.now(),
                };
              }
              return item;
            });

            // Recalcular progreso
            const progresoSI = items.filter((i) => i.cumple === true).length;
            const progresoNO = items.filter((i) => i.cumple === false).length;
            const progresoNA = items.filter(
              (i) => i.cumple === null && i.eleccionRespuestaId
            ).length;
            const completado = progresoSI + progresoNO + progresoNA === items.length;

            return {
              ...checklist,
              items,
              progresoSI,
              progresoNO,
              progresoNA,
              completado,
            };
          }
          return checklist;
        })
      );

      return true;
    } catch (err: unknown) {
      this.handleError(err, 'Error al guardar la respuesta');
      return false;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Carga los checklists de una inspección existente
   */
  async cargarChecklists(_inspeccionId: number): Promise<void> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      // TODO: Cuando el backend esté listo
      // const checklists = await firstValueFrom(
      //   this.http.get<InspeccionChecklistDTO[]>(
      //     `${this.baseUrl}/inspecciones/${_inspeccionId}/checklists`
      //   )
      // );

      // Mock: Datos de ejemplo
      const mockChecklists: InspeccionChecklistDTO[] = [];

      this.checklistsSignal.set(mockChecklists);
    } catch (err: unknown) {
      this.handleError(err, 'Error al cargar los checklists');
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Limpia el estado del servicio
   */
  limpiarEstado(): void {
    this.currentInspeccionSignal.set(null);
    this.checklistsSignal.set([]);
    this.errorSignal.set(null);
  }

  /**
   * Obtiene la lista de máquinas disponibles
   */
  async obtenerMaquinas(): Promise<Maquina[]> {
    try {
      // TODO: Cuando el backend esté listo
      // const maquinas = await firstValueFrom(
      //   this.http.get<Maquina[]>(`${this.baseUrl}/maquinas`)
      // );

      // Mock: Datos de ejemplo
      const mockMaquinas: Maquina[] = [
        { id: 1, nombre: 'VOLVO L90H' },
        { id: 2, nombre: 'CAT 320D' },
        { id: 3, nombre: 'KOMATSU PC200' },
        { id: 4, nombre: 'HITACHI ZX350' },
      ];

      return mockMaquinas;
    } catch (err: unknown) {
      this.handleError(err, 'Error al obtener las máquinas');
      return [];
    }
  }

  /**
   * Obtiene la lista de usuarios disponibles para asignar roles
   */
  async obtenerUsuarios(): Promise<UsuarioInspeccion[]> {
    try {
      // TODO: Cuando el backend esté listo
      // const usuarios = await firstValueFrom(
      //   this.http.get<UsuarioInspeccion[]>(`${this.baseUrl}/usuarios`)
      // );

      // Mock: Datos de ejemplo
      const mockUsuarios: UsuarioInspeccion[] = [
        { id: 1, nombre: 'Juan Pérez', correo: 'juan.perez@normet.com' },
        { id: 2, nombre: 'María García', correo: 'maria.garcia@normet.com' },
        { id: 3, nombre: 'Carlos López', correo: 'carlos.lopez@normet.com' },
        { id: 4, nombre: 'Ana Martínez', correo: 'ana.martinez@normet.com' },
      ];

      return mockUsuarios;
    } catch (err: unknown) {
      this.handleError(err, 'Error al obtener los usuarios');
      return [];
    }
  }

  /**
   * Maneja errores HTTP
   */
  private handleError(err: unknown, defaultMessage: string): void {
    let message = defaultMessage;
    if (err instanceof HttpErrorResponse) {
      message = err.error?.message || err.message || message;
    }
    this.errorSignal.set(message);
  }
}
