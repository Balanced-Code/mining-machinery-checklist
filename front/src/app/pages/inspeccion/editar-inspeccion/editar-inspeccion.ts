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
  Inspeccion,
  InspeccionItemDTO,
  Maquina,
  Observacion,
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
  protected readonly maquinaId = signal<number | null>(null);
  protected readonly nSerieMotor = signal<string | null>(null);
  protected readonly cabinado = signal<boolean | null>(null);
  protected readonly horometro = signal<number | null>(null);
  protected readonly supervisorId = signal<number | null>(null);
  protected readonly tecnicoIds = signal<number[]>([]);

  // Datos del formulario
  protected readonly maquinas = signal<Maquina[]>([]);
  protected readonly usuarios = signal<UsuarioInspeccion[]>([]);
  protected readonly templatesDisponibles = signal<ChecklistTemplate[]>([]);

  // Filtros de búsqueda
  protected readonly searchMaquina = signal('');
  protected readonly searchSupervisor = signal('');
  protected readonly searchTecnicos = signal('');

  // Listas filtradas
  protected readonly maquinasFiltradas = computed(() => {
    const search = this.searchMaquina().toLowerCase().trim();
    if (!search) return this.maquinas();

    return this.maquinas().filter((maquina) => maquina.nombre.toLowerCase().includes(search));
  });

  protected readonly usuariosFiltradosSupervisor = computed(() => {
    const search = this.searchSupervisor().toLowerCase().trim();
    if (!search) return this.usuarios();

    return this.usuarios().filter(
      (usuario) =>
        usuario.nombre.toLowerCase().includes(search) ||
        usuario.correo.toLowerCase().includes(search)
    );
  });

  protected readonly usuariosFiltradosTecnicos = computed(() => {
    const search = this.searchTecnicos().toLowerCase().trim();
    if (!search) return this.usuarios();

    return this.usuarios().filter(
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

  // Usuario actual (inspector)
  protected readonly inspector = this.authService.user;

  // Validaciones
  protected readonly formularioValido = computed(() => {
    return (
      this.fechaInicio() !== null &&
      this.horaInicio() !== null &&
      this.numSerie().trim().length > 0 &&
      this.maquinaId() !== null &&
      this.checklists().length > 0 &&
      this.checklists().every((c) => c.templateId > 0) // No placeholders
    );
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
    const [maquinas, usuarios, templates] = await Promise.all([
      this.inspeccionService.obtenerMaquinas(),
      this.inspeccionService.obtenerUsuarios(),
      this.obtenerTemplates(),
    ]);

    this.maquinas.set(maquinas);
    this.usuarios.set(usuarios);
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

    // Cargar supervisor y técnicos desde asignaciones
    if (inspeccion.asignaciones && inspeccion.asignaciones.length > 0) {
      console.log('📋 Cargando asignaciones:', inspeccion.asignaciones);

      // Buscar supervisor (rol id 3 o nombre "Supervisor")
      const supervisorAsignacion = inspeccion.asignaciones.find(
        (a) => a.rolAsignacion?.id === 3 || a.rolAsignacion?.nombre === 'Supervisor'
      );
      if (supervisorAsignacion) {
        console.log('👤 Supervisor encontrado:', supervisorAsignacion.usuarioId);
        this.supervisorId.set(supervisorAsignacion.usuarioId);
      }

      // Buscar técnicos (rol ID 2 o nombre "Técnico")
      const tecnicoAsignaciones = inspeccion.asignaciones.filter(
        (a) => a.rolAsignacion?.id === 2 || a.rolAsignacion?.nombre === 'Técnico'
      );
      if (tecnicoAsignaciones.length > 0) {
        const tecnicoIds = tecnicoAsignaciones.map((a) => a.usuarioId);
        console.log('👥 Técnicos encontrados:', tecnicoIds);
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
   * Se llama cuando cambia la fecha o hora de inicio
   */
  protected async onFechaHoraChange(): Promise<void> {
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
   * Se llama cuando cambia el supervisor
   */
  protected async onSupervisorChange(supervisorId: number | null): Promise<void> {
    console.log('🔄 onSupervisorChange llamado - iniciando debounce:', {
      supervisorId,
      inspeccionId: this.inspeccionId(),
    });
    await this.autoGuardar();
  }

  /**
   * Se llama cuando cambian los técnicos
   */
  protected async onTecnicosChange(tecnicoIds: number[]): Promise<void> {
    console.log('🔄 onTecnicosChange llamado - iniciando debounce:', {
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
      console.log('⚠️ No hay inspección ID para autoguardar');
      return;
    }

    console.log('🔄 Autoguardado programado para inspección', id);

    // Cancelar el timeout anterior si existe
    if (this.autoGuardadoTimeout !== null) {
      clearTimeout(this.autoGuardadoTimeout);
    }

    // Programar nuevo guardado después de 1.5 segundos
    this.autoGuardadoTimeout = window.setTimeout(async () => {
      try {
        console.log('💾 Ejecutando guardado automático...');

        // 1. Guardar datos básicos
        const datos = {
          fechaInicio: this.fechaHoraInicio().toISOString(),
          numSerie: this.numSerie(),
          maquinaId: this.maquinaId() ?? undefined,
          nSerieMotor: this.nSerieMotor() || undefined,
          cabinado: this.cabinado() ?? undefined,
          horometro: this.horometro() ?? undefined,
        };
        console.log('📄 Guardando datos básicos:', datos);
        await this.inspeccionService.actualizar(id, datos);
        console.log('✅ Datos básicos guardados');

        // 2. Sincronizar supervisor
        const supervisorId = this.supervisorId();
        const asignacionesActuales = this.inspeccionService.currentInspeccion()?.asignaciones || [];

        // Buscar si ya hay un supervisor asignado
        const supervisorAsignadoAntes = asignacionesActuales.find(
          (a) => a.rolAsignacion?.id === 3 || a.rolAsignacion?.nombre === 'Supervisor'
        );

        if (supervisorId !== null) {
          // Asignar nuevo supervisor o actualizar
          console.log(`👤 Guardando supervisor ${supervisorId}`);
          await this.inspeccionService.asignarUsuario(id, supervisorId, 3);
          console.log('✅ Supervisor guardado');
        } else if (supervisorAsignadoAntes) {
          // Eliminar supervisor si había uno y ahora es null
          console.log(`➖ Eliminando supervisor ${supervisorAsignadoAntes.usuarioId}`);
          await this.inspeccionService.eliminarAsignacion(id, supervisorAsignadoAntes.usuarioId);
          console.log('✅ Supervisor eliminado');
        }

        // 3. Sincronizar técnicos
        const tecnicoIdsActuales = this.tecnicoIds();

        // Obtener IDs de técnicos que ya están asignados (rol Técnico = ID 2)
        const tecnicosAsignadosAntes = asignacionesActuales
          .filter((a) => a.rolAsignacion?.nombre === 'Técnico' || a.rolAsignacion?.id === 2)
          .map((a) => a.usuarioId);

        console.log('👥 Técnicos actuales:', tecnicoIdsActuales);
        console.log('👥 Técnicos asignados antes:', tecnicosAsignadosAntes);

        // Agregar nuevos técnicos
        const tecnicosAAgregar = tecnicoIdsActuales.filter(
          (id) => !tecnicosAsignadosAntes.includes(id)
        );
        for (const tecnicoId of tecnicosAAgregar) {
          console.log(`➕ Agregando técnico ${tecnicoId}`);
          // Rol ID 2 = Técnico (según seed)
          await this.inspeccionService.asignarUsuario(id, tecnicoId, 2);
        }

        // Eliminar técnicos deseleccionados
        const tecnicosAEliminar = tecnicosAsignadosAntes.filter(
          (id) => !tecnicoIdsActuales.includes(id)
        );
        for (const tecnicoId of tecnicosAEliminar) {
          console.log(`➖ Eliminando técnico ${tecnicoId}`);
          await this.inspeccionService.eliminarAsignacion(id, tecnicoId);
        }

        if (tecnicosAAgregar.length > 0 || tecnicosAEliminar.length > 0) {
          console.log(
            `✅ Técnicos sincronizados (+${tecnicosAAgregar.length}, -${tecnicosAEliminar.length})`
          );
        }

        console.log('✅ Guardado automático completado');
      } catch (error) {
        console.error('❌ Error en guardado automático:', error);
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

    // Solo enviar observación si tiene un ID real de base de datos
    const observacionId =
      item.observacion?.id && item.observacion.id < 1000000000000 ? item.observacion.id : undefined;

    await this.inspeccionService.guardarRespuesta(checklist.templateId, {
      templateSeccionId: item.templateSeccionId,
      cumple,
      observacion: item.observacion
        ? {
            id: observacionId,
            descripcion: item.observacion.descripcion,
            archivosExistentes: item.observacion.archivos,
          }
        : undefined,
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
      .subscribe(async (result: Omit<Observacion, 'id'> | string) => {
        // Si el resultado es 'DELETE', eliminar la observación
        if (result === 'DELETE') {
          await this.inspeccionService.guardarRespuesta(checklist.templateId, {
            templateSeccionId: item.templateSeccionId,
            cumple: item.cumple,
            observacion: undefined, // Eliminar observación
          });
          return;
        }

        // Caso normal: guardar o actualizar observación
        // Solo enviar el ID si es un ID real de base de datos (no temporal)
        const observacionId =
          item.observacion?.id && item.observacion.id < 1000000000000
            ? item.observacion.id
            : undefined;

        await this.inspeccionService.guardarRespuesta(checklist.templateId, {
          templateSeccionId: item.templateSeccionId,
          cumple: item.cumple,
          observacion: {
            id: observacionId,
            ...(result as Omit<Observacion, 'id'>),
          },
        });
      });
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

    // Guardar cambios finales antes de terminar
    await this.inspeccionService.actualizar(id, {
      fechaInicio: this.fechaHoraInicio().toISOString(),
      numSerie: this.numSerie(),
      maquinaId: this.maquinaId() ?? undefined,
    });

    // Terminar la inspección
    const terminada = await this.inspeccionService.terminar(id);

    if (terminada) {
      this.router.navigate(['/historial']);
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

  protected get inspectorNombre(): string {
    const user = this.inspector();
    return user ? this.formatUsuario(user) : 'Cargando...';
  }
}
