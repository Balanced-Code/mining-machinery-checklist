import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { ChecklistTemplate } from '@core/models/checklist.model';
import {
  Archivo,
  Inspeccion,
  InspeccionItemDTO,
  Maquina,
  UsuarioInspeccion,
} from '@core/models/inspeccion.model';
import { AuthService } from '@core/services/auth.service';
import { InspeccionService } from '@core/services/inspeccion.service';
import { ConfirmDialog } from '@shared/components/confirm-dialog/confirm-dialog';
import { ObservacionDialog } from '@shared/components/observacion-dialog/observacion-dialog';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { DatePicker } from 'primeng/datepicker';
import { filter } from 'rxjs';

@Component({
  selector: 'app-editar-inspeccion',
  imports: [
    FormsModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    NgxMatSelectSearchModule,
    DatePicker,
    ConfirmDialog,
  ],
  templateUrl: './editar-inspeccion.html',
  styleUrl: './editar-inspeccion.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditarInspeccion implements OnInit, OnDestroy {
  protected readonly inspeccionService = inject(InspeccionService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);

  // ID de la inspección a editar
  private readonly inspeccionId = signal<number | null>(null);

  // Estados del formulario
  protected readonly fechaInicio = signal<Date>(new Date());
  protected readonly horaInicio = signal<Date>(new Date());
  protected readonly fechaFin = signal<Date | null>(null);
  protected readonly horaFin = signal<Date | null>(null);
  protected readonly numSerie = signal('');
  protected readonly numSerieValidando = signal(false);
  protected readonly numSerieError = signal<string | null>(null);
  protected readonly maquinaId = signal<number | null>(null);
  protected readonly nSerieMotor = signal<string | null>(null);
  protected readonly cabinado = signal<boolean | null>(null);
  protected readonly horometro = signal<number | null>(null);
  protected readonly inspectorId = signal<number | null>(null);
  protected readonly supervisorId = signal<number | null>(null);
  protected readonly tecnicoIds = signal<number[]>([]);

  // Datos del formulario
  protected readonly maquinas = signal<Maquina[]>([]);
  protected readonly inspectores = signal<UsuarioInspeccion[]>([]);
  protected readonly supervisores = signal<UsuarioInspeccion[]>([]);
  protected readonly tecnicos = signal<UsuarioInspeccion[]>([]);
  protected readonly templatesDisponibles = signal<ChecklistTemplate[]>([]);

  // Filtros de búsqueda
  protected readonly searchMaquina = signal('');
  protected readonly searchInspector = signal('');
  protected readonly searchSupervisor = signal('');
  protected readonly searchTecnicos = signal('');

  // Listas filtradas
  protected readonly maquinasFiltradas = computed(() => {
    const search = this.searchMaquina().toLowerCase().trim();
    if (!search) return this.maquinas();

    return this.maquinas().filter((maquina) => maquina.nombre.toLowerCase().includes(search));
  });

  protected readonly inspectoresFiltrados = computed(() => {
    const search = this.searchInspector().toLowerCase().trim();

    // Aplicar solo búsqueda (ya vienen filtrados por rol del backend)
    if (!search) return this.inspectores();

    return this.inspectores().filter(
      (usuario) =>
        usuario.nombre.toLowerCase().includes(search) ||
        usuario.correo.toLowerCase().includes(search)
    );
  });

  protected readonly supervisoresFiltrados = computed(() => {
    const search = this.searchSupervisor().toLowerCase().trim();

    // Aplicar solo búsqueda (ya vienen filtrados por rol del backend)
    if (!search) return this.supervisores();

    return this.supervisores().filter(
      (usuario) =>
        usuario.nombre.toLowerCase().includes(search) ||
        usuario.correo.toLowerCase().includes(search)
    );
  });

  protected readonly tecnicosFiltrados = computed(() => {
    const search = this.searchTecnicos().toLowerCase().trim();

    // Aplicar solo búsqueda (ya vienen filtrados por rol del backend)
    if (!search) return this.tecnicos();

    return this.tecnicos().filter(
      (usuario) =>
        usuario.nombre.toLowerCase().includes(search) ||
        usuario.correo.toLowerCase().includes(search)
    );
  });

  // Estados de UI
  protected readonly showConfirmSalir = signal(false);
  protected readonly showConfirmTerminar = signal(false);
  private agregandoChecklist = false;
  private autoGuardadoTimeout: number | null = null;

  // Computed del servicio
  protected readonly checklists = this.inspeccionService.checklists;
  protected readonly resumen = this.inspeccionService.resumen;
  protected readonly loading = this.inspeccionService.loading;

  // IDs de templates ya seleccionados
  protected readonly selectedTemplateIds = computed(() => {
    return this.checklists()
      .map((c) => c.templateId)
      .filter((id) => id > 0);
  });

  // Verificar si la inspección ya está terminada
  protected readonly inspeccionYaTerminada = computed(() => {
    const inspeccion = this.inspeccionService.currentInspeccion();
    return !!inspeccion?.fechaFinalizacion;
  });

  // Verificar si puede editar checklists
  protected readonly puedeEditarChecklists = computed(() => {
    const inspeccion = this.inspeccionService.currentInspeccion();
    const userLevel = this.authService.user()?.cargo?.nivel ?? 0;

    // Si la inspección está finalizada, solo nivel 4 puede editar
    if (inspeccion?.fechaFinalizacion) {
      return userLevel >= 4;
    }

    // Si no está finalizada, nivel 3+ puede editar
    return userLevel >= 3;
  });

  // Usuario actual (para permisos)
  protected readonly currentUser = this.authService.user;

  // Validaciones
  protected readonly formularioValido = computed(() => {
    const validacionBasica =
      this.fechaInicio() !== null &&
      this.horaInicio() !== null &&
      this.numSerie().trim().length > 0 &&
      this.numSerieError() === null && // No debe haber error de validación
      this.maquinaId() !== null &&
      this.checklists().length > 0 &&
      this.checklists().every((c) => c.templateId > 0); // No placeholders

    // Si la inspección ya está terminada, también validar fecha fin
    if (this.inspeccionYaTerminada()) {
      return validacionBasica && this.fechaFin() !== null && this.horaFin() !== null;
    }

    return validacionBasica;
  });

  // Combinar fecha y hora de inicio en un solo Date
  protected readonly fechaHoraInicio = computed(() => {
    const fecha = this.fechaInicio();
    const hora = this.horaInicio();

    if (!fecha || !hora) return new Date();

    const resultado = new Date(fecha);
    resultado.setHours(hora.getHours());
    resultado.setMinutes(hora.getMinutes());
    resultado.setSeconds(hora.getSeconds());

    return resultado;
  });

  // Combinar fecha y hora de fin en un solo Date (si existe)
  protected readonly fechaHoraFin = computed(() => {
    const fecha = this.fechaFin();
    const hora = this.horaFin();

    if (!fecha || !hora) return null;

    const resultado = new Date(fecha);
    resultado.setHours(hora.getHours());
    resultado.setMinutes(hora.getMinutes());
    resultado.setSeconds(hora.getSeconds());

    return resultado;
  });

  // Formato de fecha fin para mostrar
  protected readonly fechaFinFormateada = computed(() => {
    const fechaHora = this.fechaHoraFin();
    if (!fechaHora) return '-';

    return fechaHora.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  });

  // Validar que todos los items con "NO" tengan observación
  protected readonly todosLosNoTienenObservacion = computed(() => {
    const checklists = this.checklists();

    for (const checklist of checklists) {
      for (const item of checklist.items) {
        // Si el item tiene cumple=false (NO) y no tiene observación, es inválido
        if (item.cumple === false && !item.observacion?.descripcion?.trim()) {
          return false;
        }
      }
    }

    return true;
  });

  protected readonly puedeTerminar = computed(() => {
    return (
      this.formularioValido() && this.resumen().completado && this.todosLosNoTienenObservacion()
    );
  });

  async ngOnInit() {
    // Obtener el ID de la inspección desde la ruta
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      // Si no hay ID, redirigir al historial
      this.router.navigate(['/historial']);
      return;
    }

    this.inspeccionId.set(Number(id));
    await this.cargarInspeccion(Number(id));

    // Validar permisos después de cargar la inspección
    this.validarPermisos();
  }

  ngOnDestroy() {
    // Limpiar timeout de autoguardado si existe
    if (this.autoGuardadoTimeout !== null) {
      clearTimeout(this.autoGuardadoTimeout);
    }
    this.inspeccionService.limpiarEstado();
  }

  private async cargarInspeccion(id: number): Promise<void> {
    // Cargar datos generales
    const [maquinas, inspectores, supervisores, tecnicos, templates] = await Promise.all([
      this.inspeccionService.obtenerMaquinas(),
      this.inspeccionService.obtenerInspectores(),
      this.inspeccionService.obtenerSupervisores(),
      this.inspeccionService.obtenerTecnicos(),
      this.obtenerTemplates(),
    ]);

    this.maquinas.set(maquinas);
    this.inspectores.set(inspectores);
    this.supervisores.set(supervisores);
    this.tecnicos.set(tecnicos);
    this.templatesDisponibles.set(templates);

    // Cargar la inspección específica
    const inspeccion = await this.inspeccionService.obtenerPorId(id);
    if (!inspeccion) {
      // Si no se encuentra, redirigir
      this.router.navigate(['/historial']);
      return;
    }

    // Cargar checklists de la inspección
    await this.inspeccionService.cargarChecklists(id);

    // Poblar el formulario con los datos de la inspección
    this.poblarFormulario(inspeccion);
  }

  /**
   * Validar permisos de edición
   * - Nivel 3+: puede editar si no está finalizada
   * - Nivel 4: puede editar incluso si está finalizada
   */
  private validarPermisos(): void {
    const inspeccion = this.inspeccionService.currentInspeccion();
    if (!inspeccion) return;

    const userLevel = this.authService.user()?.cargo?.nivel ?? 0;

    // Si la inspección está finalizada y el usuario no es nivel 4
    if (inspeccion.fechaFinalizacion && userLevel < 4) {
      alert(
        'Esta inspección está finalizada. Solo los administradores (nivel 4) pueden modificarla.'
      );
      this.router.navigate(['/inspeccion/ver', inspeccion.id]);
      return;
    }

    // Si no tiene nivel 3+
    if (userLevel < 3) {
      alert('No tienes permisos para editar inspecciones.');
      this.router.navigate(['/historial']);
    }
  }

  /**
   * Cerrar el banner de error
   */
  protected cerrarError(): void {
    this.inspeccionService.limpiarError();
  }

  private poblarFormulario(inspeccion: Inspeccion): void {
    // Fecha y hora de inicio
    const fechaInicio = new Date(inspeccion.fechaInicio);
    this.fechaInicio.set(fechaInicio);
    this.horaInicio.set(fechaInicio);

    // Fecha y hora de fin (si existe)
    if (inspeccion.fechaFinalizacion) {
      const fechaFin = new Date(inspeccion.fechaFinalizacion);
      this.fechaFin.set(fechaFin);
      this.horaFin.set(fechaFin);
    }

    // Datos básicos
    this.numSerie.set(inspeccion.numSerie);
    this.maquinaId.set(inspeccion.maquinaId);
    this.nSerieMotor.set(inspeccion.nSerieMotor || null);
    this.cabinado.set(inspeccion.cabinado ?? null);
    this.horometro.set(inspeccion.horometro ? Number(inspeccion.horometro) : null);

    // Cargar inspector, supervisor y técnicos desde asignaciones
    if (inspeccion.asignaciones && inspeccion.asignaciones.length > 0) {
      // Buscar inspector (rol ID 1 o nombre "Inspector")
      const inspectorAsignacion = inspeccion.asignaciones.find(
        (a) => a.rolAsignacion?.id === 1 || a.rolAsignacion?.nombre === 'Inspector'
      );
      if (inspectorAsignacion) {
        this.inspectorId.set(inspectorAsignacion.usuarioId);
      }

      // Buscar supervisor (rol ID 2 o nombre "Supervisor")
      const supervisorAsignacion = inspeccion.asignaciones.find(
        (a) => a.rolAsignacion?.id === 2 || a.rolAsignacion?.nombre === 'Supervisor'
      );
      if (supervisorAsignacion) {
        this.supervisorId.set(supervisorAsignacion.usuarioId);
      }

      // Buscar técnicos (rol ID 3 o nombre "Técnico")
      const tecnicoAsignaciones = inspeccion.asignaciones.filter(
        (a) => a.rolAsignacion?.id === 3 || a.rolAsignacion?.nombre === 'Técnico'
      );
      if (tecnicoAsignaciones.length > 0) {
        const tecnicoIds = tecnicoAsignaciones.map((a) => a.usuarioId);
        this.tecnicoIds.set(tecnicoIds);
      }
    }
  }

  private async obtenerTemplates(): Promise<ChecklistTemplate[]> {
    return this.inspeccionService.obtenerTemplates();
  }

  protected async agregarChecklist(): Promise<void> {
    // Prevenir clics múltiples rápidos (debounce manual)
    if (this.agregandoChecklist) return;

    this.agregandoChecklist = true;
    this.inspeccionService.agregarChecklistPlaceholder();

    // Liberar después de 300ms
    setTimeout(() => {
      this.agregandoChecklist = false;
    }, 300);
  }

  protected async seleccionarTemplate(
    checklistIndex: number,
    template: ChecklistTemplate
  ): Promise<void> {
    if (this.isChecklistSelected(template.id)) return;

    const id = this.inspeccionId();
    if (!id) return;

    // Agregar el template al backend
    const agregado = await this.inspeccionService.agregarTemplateAInspeccion(id, template.id);

    if (agregado) {
      // Actualizar localmente
      await this.inspeccionService.reemplazarChecklist(checklistIndex, template);
    }
  }

  protected isChecklistSelected(templateId: number): boolean {
    return this.selectedTemplateIds().includes(templateId);
  }

  protected async eliminarChecklist(index: number): Promise<void> {
    const id = this.inspeccionId();
    const checklist = this.checklists()[index];

    if (!id || !checklist) return;

    // Si es un placeholder (templateId negativo), solo eliminar localmente
    if (checklist.templateId < 0) {
      await this.inspeccionService.eliminarChecklist(index);
      return;
    }

    // Eliminar del backend
    const eliminado = await this.inspeccionService.eliminarTemplateDeInspeccion(
      id,
      checklist.templateId
    );

    if (eliminado) {
      // Eliminar localmente
      await this.inspeccionService.eliminarChecklist(index);
    }
  }

  /**
   * Se llama cuando cambia el número de serie
   */
  protected async onNumSerieChange(): Promise<void> {
    await this.autoGuardar();
  }

  /**
   * Validar número de serie cuando pierde el foco
   */
  protected async validarNumeroSerie(): Promise<void> {
    const numSerie = this.numSerie().trim();
    const inspeccionId = this.inspeccionId();

    if (!numSerie) {
      this.numSerieError.set(null);
      return;
    }

    this.numSerieValidando.set(true);
    this.numSerieError.set(null);

    try {
      const resultado = await this.inspeccionService.validarNumeroSerie(
        numSerie,
        inspeccionId ?? undefined
      );

      if (!resultado.disponible) {
        if (resultado.eliminado) {
          this.numSerieError.set(
            'El número de serie existe en una inspección eliminada. Solo un administrador puede recuperarla.'
          );
        } else {
          this.numSerieError.set('El número de serie ya existe en una inspección activa.');
        }
      }
    } catch (error) {
      console.error('Error al validar número de serie:', error);
    } finally {
      this.numSerieValidando.set(false);
    }
  }

  /**
   * Se llama cuando cambia la fecha o hora de inicio
   */
  protected async onFechaHoraChange(): Promise<void> {
    await this.autoGuardar();
  }

  /**
   * Se llama cuando cambia la fecha o hora de fin
   */
  protected async onFechaHoraFinChange(): Promise<void> {
    await this.autoGuardar();
  }

  /**
   * Se llama cuando cambia la máquina seleccionada
   */
  protected async onMaquinaChange(): Promise<void> {
    await this.autoGuardar();
  }

  /**
   * Se llama cuando cambia el número de serie del motor
   */
  protected async onNSerieMotorChange(): Promise<void> {
    await this.autoGuardar();
  }

  /**
   * Se llama cuando cambia el estado de cabinado
   */
  protected async onCabinadoChange(): Promise<void> {
    await this.autoGuardar();
  }

  /**
   * Se llama cuando cambia el horómetro
   */
  protected async onHorometroChange(): Promise<void> {
    await this.autoGuardar();
  }

  /**
   * Helper para parsear número decimal desde input
   */
  protected parseFloat(value: string): number {
    return parseFloat(value);
  }

  /**
   * Se llama cuando cambia el inspector
   */
  protected async onInspectorChange(inspectorId: number | null): Promise<void> {
    console.log('onInspectorChange llamado - iniciando debounce:', {
      inspectorId,
      inspeccionId: this.inspeccionId(),
    });
    await this.autoGuardar();
  }

  /**
   * Se llama cuando cambia el supervisor
   */
  protected async onSupervisorChange(supervisorId: number | null): Promise<void> {
    console.log('onSupervisorChange llamado - iniciando debounce:', {
      supervisorId,
      inspeccionId: this.inspeccionId(),
    });
    await this.autoGuardar();
  }

  /**
   * Se llama cuando cambian los técnicos
   */
  protected async onTecnicosChange(tecnicoIds: number[]): Promise<void> {
    console.log('onTecnicosChange llamado - iniciando debounce:', {
      tecnicoIds,
      inspeccionId: this.inspeccionId(),
    });
    await this.autoGuardar();
  }

  /**
   * Auto-guarda los cambios de la inspección
   * Cancela el timeout anterior y programa un nuevo guardado
   */
  private async autoGuardar(): Promise<void> {
    const id = this.inspeccionId();
    if (!id) {
      return;
    }

    // Cancelar el timeout anterior si existe
    if (this.autoGuardadoTimeout !== null) {
      clearTimeout(this.autoGuardadoTimeout);
    }

    // Programar nuevo guardado después de 1.5 segundos
    this.autoGuardadoTimeout = window.setTimeout(async () => {
      try {
        // 1. Guardar datos básicos
        const datos: Partial<{
          fechaInicio: string;
          fechaFinalizacion?: string;
          numSerie: string;
          maquinaId?: number;
          nSerieMotor?: string;
          cabinado?: boolean;
          horometro?: number;
        }> = {
          fechaInicio: this.fechaHoraInicio().toISOString(),
          numSerie: this.numSerie(),
          maquinaId: this.maquinaId() ?? undefined,
          nSerieMotor: this.nSerieMotor() || undefined,
          cabinado: this.cabinado() ?? undefined,
          horometro: this.horometro() ?? undefined,
        };

        // Si la inspección ya está terminada, incluir fechaFinalizacion
        if (this.inspeccionYaTerminada()) {
          const fechaHoraFin = this.fechaHoraFin();
          if (fechaHoraFin) {
            datos.fechaFinalizacion = fechaHoraFin.toISOString();
          }
        }

        await this.inspeccionService.actualizar(id, datos);

        // 2. Sincronizar inspector
        const inspectorIdActual = this.inspectorId();
        const asignacionesActuales = this.inspeccionService.currentInspeccion()?.asignaciones || [];

        // Buscar si ya hay un inspector asignado
        const inspectorAsignadoAntes = asignacionesActuales.find(
          (a) => a.rolAsignacion?.id === 1 || a.rolAsignacion?.nombre === 'Inspector'
        );

        if (inspectorIdActual !== null) {
          // Asignar nuevo inspector o actualizar
          await this.inspeccionService.asignarUsuario(id, inspectorIdActual, 1);
        } else if (inspectorAsignadoAntes) {
          // Eliminar inspector si había uno y ahora es null
          await this.inspeccionService.eliminarAsignacion(id, inspectorAsignadoAntes.usuarioId);
        }

        // 3. Sincronizar supervisor
        const supervisorId = this.supervisorId();

        // Buscar si ya hay un supervisor asignado
        const supervisorAsignadoAntes = asignacionesActuales.find(
          (a) => a.rolAsignacion?.id === 2 || a.rolAsignacion?.nombre === 'Supervisor'
        );

        if (supervisorId !== null) {
          // Asignar nuevo supervisor o actualizar

          await this.inspeccionService.asignarUsuario(id, supervisorId, 2);
        } else if (supervisorAsignadoAntes) {
          // Eliminar supervisor si había uno y ahora es null

          await this.inspeccionService.eliminarAsignacion(id, supervisorAsignadoAntes.usuarioId);
        }

        // 3. Sincronizar técnicos
        const tecnicoIdsActuales = this.tecnicoIds();

        // Obtener IDs de técnicos que ya están asignados (rol Técnico = ID 2)
        const tecnicosAsignadosAntes = asignacionesActuales
          .filter((a) => a.rolAsignacion?.nombre === 'Técnico' || a.rolAsignacion?.id === 3)
          .map((a) => a.usuarioId);

        // Agregar nuevos técnicos
        const tecnicosAAgregar = tecnicoIdsActuales.filter(
          (id) => !tecnicosAsignadosAntes.includes(id)
        );
        for (const tecnicoId of tecnicosAAgregar) {
          // Rol ID 3 = Técnico (según seed)
          await this.inspeccionService.asignarUsuario(id, tecnicoId, 3);
        }

        // Eliminar técnicos deseleccionados
        const tecnicosAEliminar = tecnicosAsignadosAntes.filter(
          (id) => !tecnicoIdsActuales.includes(id)
        );
        for (const tecnicoId of tecnicosAEliminar) {
          await this.inspeccionService.eliminarAsignacion(id, tecnicoId);
        }

        if (tecnicosAAgregar.length > 0 || tecnicosAEliminar.length > 0) {
          console.log(
            `Técnicos sincronizados (+${tecnicosAAgregar.length}, -${tecnicosAEliminar.length})`
          );
        }
      } catch (error) {
        console.error('Error en guardado automático:', error);
      } finally {
        this.autoGuardadoTimeout = null;
      }
    }, 1500);
  }

  protected async onRespuestaChange(
    checklistIndex: number,
    itemIndex: number,
    cumple: boolean | null
  ): Promise<void> {
    const checklist = this.checklists()[checklistIndex];
    const item = checklist?.items[itemIndex];
    if (!checklist || !item) return;

    // Preparar observación si existe
    let observacionData = undefined;
    if (item.observacion) {
      const observacionId =
        item.observacion.id && item.observacion.id < 1000000000000
          ? item.observacion.id
          : undefined;

      observacionData = {
        id: observacionId,
        descripcion: item.observacion.descripcion || '',
        archivosNuevos: [],
        archivosExistentes: item.observacion.archivos?.map((a) => parseInt(a.id, 10)) || [],
      };
    }

    await this.inspeccionService.guardarRespuesta(checklist.templateId, {
      templateSeccionId: item.templateSeccionId,
      cumple,
      observacion: observacionData,
    });
  }

  protected abrirObservacion(checklistIndex: number, itemIndex: number): void {
    const checklist = this.checklists()[checklistIndex];
    const item = checklist?.items[itemIndex];
    if (!checklist || !item) return;

    const dialogRef = this.dialog.open(ObservacionDialog, {
      width: '600px',
      data: {
        itemDescripcion: item.descripcion,
        observacionInicial: item.observacion,
        modo: item.observacion ? 'editar' : 'crear',
        requiereObservacion: this.requiereObservacion(item),
      },
    });

    dialogRef
      .afterClosed()
      .pipe(filter((result) => !!result))
      .subscribe(
        async (
          result:
            | 'DELETE'
            | {
                descripcion: string;
                archivosNuevos?: File[];
                archivosExistentes?: Archivo[];
                archivosEliminadosIds?: string[];
              }
        ) => {
          // Si el resultado es 'DELETE', eliminar la observación
          if (result === 'DELETE') {
            await this.inspeccionService.guardarRespuesta(checklist.templateId, {
              templateSeccionId: item.templateSeccionId,
              cumple: item.cumple,
              observacion: undefined, // Eliminar observación
            });
            return;
          }

          // Eliminar archivos marcados para eliminación
          if (result.archivosEliminadosIds && result.archivosEliminadosIds.length > 0) {
            for (const archivoId of result.archivosEliminadosIds) {
              try {
                await this.inspeccionService['archivoService'].eliminarArchivo(archivoId);
              } catch (error) {
                console.error('Error al eliminar archivo:', archivoId, error);
              }
            }
          }

          // Caso normal: guardar o actualizar observación
          // Solo enviar el ID si es un ID real de base de datos (no temporal)
          const observacionId =
            item.observacion?.id && item.observacion.id < 1000000000000
              ? item.observacion.id
              : undefined;

          // Convertir archivosExistentes de Archivo[] a number[]
          const archivosExistentesIds =
            result.archivosExistentes?.map((a) => parseInt(a.id, 10)) || [];

          await this.inspeccionService.guardarRespuesta(checklist.templateId, {
            templateSeccionId: item.templateSeccionId,
            cumple: item.cumple,
            observacion: {
              id: observacionId,
              descripcion: result.descripcion || '',
              archivosNuevos: result.archivosNuevos || [],
              archivosExistentes: archivosExistentesIds,
            },
          });
        }
      );
  }

  protected intentarSalir(): void {
    if (this.checklists().length > 0 || this.numSerie().trim().length > 0) {
      this.showConfirmSalir.set(true);
    } else {
      this.router.navigate(['/historial']);
    }
  }

  protected confirmarSalir(): void {
    this.showConfirmSalir.set(false);
    this.router.navigate(['/historial']);
  }

  protected cancelarSalir(): void {
    this.showConfirmSalir.set(false);
  }

  protected intentarTerminar(): void {
    if (!this.puedeTerminar()) return;
    this.showConfirmTerminar.set(true);
  }

  protected async confirmarTerminar(): Promise<void> {
    this.showConfirmTerminar.set(false);

    const id = this.inspeccionId();
    if (!id) return;

    // Si la inspección ya está terminada, solo guardar cambios (incluyendo fecha fin editada)
    if (this.inspeccionYaTerminada()) {
      const datos: Partial<{
        fechaInicio: string;
        fechaFinalizacion?: string;
        numSerie: string;
        maquinaId?: number;
        nSerieMotor?: string;
        cabinado?: boolean;
        horometro?: number;
      }> = {
        fechaInicio: this.fechaHoraInicio().toISOString(),
        numSerie: this.numSerie(),
        maquinaId: this.maquinaId() ?? undefined,
        nSerieMotor: this.nSerieMotor() || undefined,
        cabinado: this.cabinado() ?? undefined,
        horometro: this.horometro() ?? undefined,
      };

      const fechaHoraFin = this.fechaHoraFin();
      if (fechaHoraFin) {
        datos.fechaFinalizacion = fechaHoraFin.toISOString();
      }

      const guardado = await this.inspeccionService.actualizar(id, datos);

      if (guardado) {
        this.router.navigate(['/historial']);
      }
    } else {
      // Si NO está terminada, guardar cambios y luego terminar (genera fecha fin automáticamente)
      await this.inspeccionService.actualizar(id, {
        fechaInicio: this.fechaHoraInicio().toISOString(),
        numSerie: this.numSerie(),
        maquinaId: this.maquinaId() ?? undefined,
        nSerieMotor: this.nSerieMotor() || undefined,
        cabinado: this.cabinado() ?? undefined,
        horometro: this.horometro() ?? undefined,
      });

      // Terminar la inspección (genera fecha fin automáticamente)
      const terminada = await this.inspeccionService.terminar(id);

      if (terminada) {
        this.router.navigate(['/historial']);
      }
    }
  }

  protected cancelarTerminar(): void {
    this.showConfirmTerminar.set(false);
  }

  protected requiereObservacion(item: InspeccionItemDTO): boolean {
    return item.cumple === false;
  }

  protected formatUsuario(usuario: UsuarioInspeccion): string {
    return `${usuario.nombre} (${usuario.correo})`;
  }

  /**
   * Valida que solo se ingresen números y punto decimal
   */
  protected soloNumeros(event: KeyboardEvent): boolean {
    const charCode = event.charCode;
    const value = (event.target as HTMLInputElement).value;

    // Permitir números (0-9)
    if (charCode >= 48 && charCode <= 57) {
      return true;
    }

    // Permitir punto decimal solo si no existe ya uno
    if (charCode === 46 && !value.includes('.')) {
      return true;
    }

    // Bloquear cualquier otra tecla
    event.preventDefault();
    return false;
  }
}
