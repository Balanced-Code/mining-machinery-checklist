import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { ChecklistTemplate } from '@core/models/checklist.model';
import {
  Archivo,
  Inspeccion,
  InspeccionChecklistDTO,
  InspeccionFormDTO,
  InspeccionItemDTO,
  Maquina,
  RespuestaItemDTO,
  ResumenInspeccion,
  UsuarioInspeccion,
} from '@core/models/inspeccion.model';
import { firstValueFrom } from 'rxjs';
import { ArchivoService } from './archivo.service';
import { AuthService } from './auth.service';
import { BackendInspeccion } from './inspecciones.service';

interface BackendTemplateSeccion {
  id: number;
  nombre: string;
  orden: number;
}

interface BackendTemplate {
  id: number;
  nombre: string;
  secciones: BackendTemplateSeccion[];
}

interface TemplatesResponse {
  temps: BackendTemplate[];
  total: number;
}

interface UsuariosResponse {
  users: UsuarioInspeccion[];
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class InspeccionService {
  private readonly http = inject(HttpClient);
  private readonly archivoService = inject(ArchivoService);
  private readonly authService = inject(AuthService);

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

  private readonly baseUrl = '/api';

  /**
   * Crea una nueva inspección
   */
  async crear(data: InspeccionFormDTO): Promise<Inspeccion | null> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      // Mapear al formato del backend
      const payload = {
        fechaInicio: data.fechaInicio,
        maquinaId: data.maquinaId,
        numSerie: data.numSerie,
        nSerieMotor: data.nSerieMotor,
        cabinado: data.cabinado,
        horometro: data.horometro,
        templateIds: data.templateIds,
        // Nota: supervisorId y tecnicoIds se ignoran por ahora ya que el backend no los soporta en creación
      };

      const response = await firstValueFrom(
        this.http.post<{
          success: boolean;
          inspeccion: {
            id: string;
            fechaInicio: string;
            fechaFinalizacion: string | null;
            maquinaId: number;
            numSerie: string;
            nSerieMotor: string | null;
            cabinado: boolean | null;
            horometro: number | null;
            creadoPor: number;
            creadoEn: string;
            maquina?: { id: number; nombre: string };
          };
        }>(`${this.baseUrl}/inspecciones`, payload)
      );

      if (response.success && response.inspeccion) {
        // Mapear la respuesta del backend al modelo del frontend
        const nuevaInspeccion: Inspeccion = {
          id: parseInt(response.inspeccion.id, 10),
          fechaInicio: response.inspeccion.fechaInicio,
          fechaFinalizacion: response.inspeccion.fechaFinalizacion,
          maquinaId: response.inspeccion.maquinaId,
          numSerie: response.inspeccion.numSerie,
          nSerieMotor: response.inspeccion.nSerieMotor,
          cabinado: response.inspeccion.cabinado,
          horometro: response.inspeccion.horometro,
          creadoPor: response.inspeccion.creadoPor,
          creadoEn: response.inspeccion.creadoEn
            ? new Date(response.inspeccion.creadoEn)
            : undefined,
          maquina: response.inspeccion.maquina
            ? {
                id: response.inspeccion.maquina.id,
                nombre: response.inspeccion.maquina.nombre,
              }
            : undefined,
        };

        this.currentInspeccionSignal.set(nuevaInspeccion);
        return nuevaInspeccion;
      }
      return null;
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
      const response = await firstValueFrom(
        this.http.get<BackendInspeccion>(`${this.baseUrl}/inspecciones/${id}`)
      );

      // Mapear respuesta
      const inspeccion: Inspeccion = {
        id: parseInt(response.id, 10),
        fechaInicio: response.fechaInicio,
        fechaFinalizacion: response.fechaFinalizacion,
        maquinaId: response.maquinaId,
        numSerie: response.numSerie,
        nSerieMotor: response.nSerieMotor,
        cabinado: response.cabinado,
        horometro: response.horometro,
        creadoPor: response.creadoPor,
        creadoEn: response.creadoEn ? new Date(response.creadoEn) : undefined,
        maquina: response.maquina
          ? {
              id: response.maquina.id,
              nombre: response.maquina.nombre,
            }
          : undefined,
        asignaciones: response.asignaciones?.map((a) => ({
          id: parseInt(a.id, 10),
          inspeccionId: parseInt(a.inspeccionId, 10),
          usuarioId: a.usuarioId,
          rolAsignacionId: a.rolAsignacionId,
          usuario: a.usuario,
          rolAsignacion: a.rolAsignacion,
        })),
      };

      this.currentInspeccionSignal.set(inspeccion);
      return inspeccion;
    } catch (err: unknown) {
      this.handleError(err, 'Error al obtener la inspección');
      return null;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Actualiza una inspección existente
   * Si la inspección está finalizada y el usuario es administrador (nivel 4),
   * usa el endpoint /admin que permite editar inspecciones finalizadas
   */
  async actualizar(id: number, data: Partial<InspeccionFormDTO>): Promise<boolean> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const currentInspeccion = this.currentInspeccionSignal();
      const userLevel = this.authService.user()?.cargo?.nivel ?? 0;

      // Determinar qué endpoint usar
      let endpoint = `${this.baseUrl}/inspecciones/${id}`;

      // Si la inspección está finalizada y el usuario es nivel 4 (administrador),
      // usar el endpoint admin
      if (currentInspeccion?.fechaFinalizacion && userLevel >= 4) {
        endpoint = `${this.baseUrl}/inspecciones/${id}/admin`;
      }

      await firstValueFrom(this.http.patch(endpoint, data));

      // Actualizar estado local
      const current = this.currentInspeccionSignal();
      if (current && current.id === id) {
        this.currentInspeccionSignal.set({
          ...current,
          ...data,
          actualizadoEn: new Date(),
        });
      }

      return true;
    } catch (err: unknown) {
      console.error('Error en PATCH:', err);
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

      await firstValueFrom(this.http.post(`${this.baseUrl}/inspecciones/${id}/terminar`, {}));

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
      await firstValueFrom(this.http.delete(`${this.baseUrl}/inspecciones/${id}`));

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
   * Reactivar una inspección eliminada (solo admins)
   */
  async reactivar(id: number): Promise<boolean> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<{ inspeccion: BackendInspeccion }>(
          `${this.baseUrl}/inspecciones/${id}/reactivar`,
          {}
        )
      );

      // Actualizar la inspección actual si es la misma
      if (response?.inspeccion && this.currentInspeccionSignal()?.id === id) {
        this.currentInspeccionSignal.update((current) => {
          if (!current) return current;
          return {
            ...current,
            eliminadoPor: undefined,
            eliminadoEn: undefined,
          };
        });
      }

      return true;
    } catch (err: unknown) {
      this.handleError(err, 'Error al reactivar la inspección');
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
    this.checklistsSignal.update((checklists) => {
      // Asegurar que sea un array antes de hacer spread
      const currentChecklists = Array.isArray(checklists) ? checklists : [];
      return [...currentChecklists, placeholder];
    });
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
      const currentInspeccion = this.currentInspeccionSignal();

      // Subir archivos nuevos si existen
      const archivosSubidos: Archivo[] = [];
      if (respuesta.observacion?.archivosNuevos) {
        for (const file of respuesta.observacion.archivosNuevos) {
          try {
            const archivoSubido = await this.archivoService.subirArchivo(file);
            archivosSubidos.push(archivoSubido);
          } catch (error) {
            console.error('Error al subir archivo:', error);
            // Continuar con los demás archivos
          }
        }
      }

      // Combinar IDs de archivos nuevos con existentes para enviar al backend
      const todosLosArchivosIds = [
        ...archivosSubidos.map((a) => parseInt(a.id, 10)),
        ...(respuesta.observacion?.archivosExistentes || []),
      ];

      // Solo enviar al backend si la inspección ya fue creada
      // En modo "crear", las respuestas se guardan solo localmente hasta que se cree la inspección
      if (currentInspeccion) {
        // Determinar si se debe enviar la observación:
        // - Si tiene ID: SIEMPRE enviar (incluso vacía) para que el backend pueda eliminarla si no tiene contenido
        // - Si NO tiene ID: solo enviar si tiene descripción (no crear observaciones vacías)
        const debeEnviarObservacion =
          respuesta.observacion &&
          (respuesta.observacion.id || respuesta.observacion.descripcion.trim());

        await firstValueFrom(
          this.http.post(`${this.baseUrl}/inspecciones/respuestas`, {
            inspeccionId: currentInspeccion.id.toString(),
            templateId,
            ...respuesta,
            observacion:
              debeEnviarObservacion && respuesta.observacion
                ? {
                    ...(respuesta.observacion.id && { id: respuesta.observacion.id }),
                    descripcion: respuesta.observacion.descripcion || '',
                    archivosExistentes: todosLosArchivosIds,
                  }
                : undefined,
          })
        );

        // Recargar los checklists para reflejar el estado real del backend
        // Esto es especialmente importante cuando se elimina una observación vacía
        await this.cargarChecklists(Number(currentInspeccion.id));
        return true;
      }

      // Modo crear: actualizar localmente (la inspección aún no existe en el backend)
      this.checklistsSignal.update((checklists) =>
        checklists.map((checklist) => {
          if (checklist.templateId === templateId) {
            const items = checklist.items.map((item) => {
              if (item.templateSeccionId === respuesta.templateSeccionId) {
                // Generar ID temporal solo para UI local, no para enviar al backend
                const observacionIdLocal =
                  respuesta.observacion?.id && respuesta.observacion.id < 1000000000000
                    ? respuesta.observacion.id
                    : Date.now();

                return {
                  ...item,
                  cumple: respuesta.cumple,
                  observacion: respuesta.observacion
                    ? {
                        id: observacionIdLocal,
                        descripcion: respuesta.observacion.descripcion,
                        archivos: archivosSubidos || [],
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
      const response = await firstValueFrom(
        this.http.get<{ checklists: InspeccionChecklistDTO[] }>(
          `${this.baseUrl}/inspecciones/${_inspeccionId}/checklists`
        )
      );

      // Extraer el array de checklists de la respuesta
      const checklists = response.checklists || [];
      this.checklistsSignal.set(Array.isArray(checklists) ? checklists : []);
    } catch (err: unknown) {
      this.handleError(err, 'Error al cargar los checklists');
      // En caso de error, establecer array vacío
      this.checklistsSignal.set([]);
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Agrega un template a una inspección existente
   */
  async agregarTemplateAInspeccion(inspeccionId: number, templateId: number): Promise<boolean> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/inspecciones/${inspeccionId}/templates`, {
          templateId,
        })
      );

      return true;
    } catch (err: unknown) {
      console.error('Error al agregar template:', err);
      this.handleError(err, 'Error al agregar el checklist');
      return false;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Elimina un template de una inspección
   */
  async eliminarTemplateDeInspeccion(inspeccionId: number, templateId: number): Promise<boolean> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      await firstValueFrom(
        this.http.delete(`${this.baseUrl}/inspecciones/${inspeccionId}/templates/${templateId}`)
      );

      return true;
    } catch (err: unknown) {
      console.error('Error al eliminar template:', err);
      this.handleError(err, 'Error al eliminar el checklist');
      return false;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Asigna un usuario con un rol a una inspección
   */
  async asignarUsuario(
    inspeccionId: number,
    usuarioId: number,
    rolAsignacionId: number
  ): Promise<boolean> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      console.log(
        `📡 Asignando usuario ${usuarioId} con rol ${rolAsignacionId} a inspección ${inspeccionId}`
      );

      await firstValueFrom(
        this.http.post(`${this.baseUrl}/inspecciones/${inspeccionId}/asignaciones`, {
          usuarioId,
          rolAsignacionId,
        })
      );

      return true;
    } catch (err: unknown) {
      console.error('Error al asignar usuario:', err);
      this.handleError(err, 'Error al asignar usuario');
      return false;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Elimina una asignación de usuario de una inspección
   */
  async eliminarAsignacion(inspeccionId: number, usuarioId: number): Promise<boolean> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      await firstValueFrom(
        this.http.delete(`${this.baseUrl}/inspecciones/${inspeccionId}/asignaciones/${usuarioId}`)
      );
      return true;
    } catch (err: unknown) {
      this.handleError(err, 'Error al eliminar asignación');
      return false;
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
   * Limpia solo el mensaje de error
   */
  limpiarError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Obtiene la lista de máquinas disponibles
   */
  async obtenerMaquinas(): Promise<Maquina[]> {
    try {
      const maquinas = await firstValueFrom(this.http.get<Maquina[]>(`${this.baseUrl}/maquinas`));

      return maquinas;
    } catch (err: unknown) {
      this.handleError(err, 'Error al obtener las máquinas');
      return [];
    }
  }

  /**
   * Crea una nueva máquina
   */
  async crearMaquina(nombre: string): Promise<Maquina | null> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; maquina: Maquina }>(`${this.baseUrl}/maquinas`, {
          nombre,
        })
      );

      if (response.success && response.maquina) {
        return response.maquina;
      }
      return null;
    } catch (err: unknown) {
      this.handleError(err, 'Error al crear la máquina');
      return null;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Obtiene la lista de usuarios disponibles para asignar roles
   */
  async obtenerUsuarios(): Promise<UsuarioInspeccion[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<UsuariosResponse>(`${this.baseUrl}/usuarios`)
      );

      return response.users;
    } catch (err: unknown) {
      this.handleError(err, 'Error al obtener los usuarios');
      return [];
    }
  }

  /**
   * Obtiene la lista de templates de checklist disponibles
   */
  async obtenerTemplates(): Promise<ChecklistTemplate[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<TemplatesResponse>(`${this.baseUrl}/templates`)
      );

      if (response && response.temps) {
        return response.temps.map((t) => ({
          id: t.id,
          titulo: t.nombre,
          items: t.secciones.map((s) => ({
            id: s.id,
            orden: s.orden,
            descripcion: s.nombre,
            checklistTemplateId: t.id,
          })),
        }));
      }

      return [];
    } catch (err: unknown) {
      this.handleError(err, 'Error al obtener los templates');
      return [];
    }
  }

  /**
   * Validar número de serie (verifica si existe y si está eliminado)
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
      const url = excludeId
        ? `${this.baseUrl}/inspecciones/validar-num-serie/${numSerie}?excludeId=${excludeId}`
        : `${this.baseUrl}/inspecciones/validar-num-serie/${numSerie}`;

      const response = await firstValueFrom(
        this.http.get<{
          disponible: boolean;
          eliminado?: boolean;
          message: string;
          detalles?: { maquina?: string };
        }>(url)
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
   * Maneja errores HTTP
   */
  private handleError(err: unknown, defaultMessage: string): void {
    let message = defaultMessage;
    if (err instanceof HttpErrorResponse) {
      // Verificar si es error 409 (número de serie duplicado)
      if (err.status === 409) {
        message = 'El número de serie ya existe. Por favor, use un número de serie diferente.';
      }
      // Verificar si es error de Prisma P2002 en la respuesta
      else if (
        err.error?.prismaError?.code === 'P2002' &&
        err.error?.prismaError?.meta?.target?.includes('num_serie')
      ) {
        message = 'El número de serie ya existe. Por favor, use un número de serie diferente.';
      }
      // Otros errores
      else {
        message = err.error?.message || err.message || message;
      }
    }
    this.errorSignal.set(message);
  }
}
