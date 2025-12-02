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
import { Router } from '@angular/router';
import { ChecklistTemplate } from '@core/models/checklist.model';
import {
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
  selector: 'app-crear-inspeccion',
  imports: [
    FormsModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    NgxMatSelectSearchModule,
    DatePicker,
    ConfirmDialog,
  ],
  templateUrl: './crear-inspeccion.html',
  styleUrl: './crear-inspeccion.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrearInspeccion implements OnInit, OnDestroy {
  protected readonly inspeccionService = inject(InspeccionService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  // Estados del formulario
  protected readonly fechaInicio = signal<Date>(new Date());
  protected readonly horaInicio = signal<Date>(new Date());
  protected readonly numSerie = signal('');
  protected readonly maquinaNombre = signal(''); // Nombre de la máquina (puede ser nueva)
  protected readonly maquinaId = signal<number | null>(null); // ID solo si existe
  protected readonly nSerieMotor = signal('');
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

  protected readonly supervisoresFiltrados = computed(() => {
    const search = this.searchSupervisor().toLowerCase().trim();
    if (!search) return this.usuarios();

    return this.usuarios().filter(
      (usuario) =>
        usuario.nombre.toLowerCase().includes(search) ||
        usuario.correo.toLowerCase().includes(search)
    );
  });

  protected readonly tecnicosFiltrados = computed(() => {
    const search = this.searchTecnicos().toLowerCase().trim();
    if (!search) return this.usuarios();

    return this.usuarios().filter(
      (usuario) =>
        usuario.nombre.toLowerCase().includes(search) ||
        usuario.correo.toLowerCase().includes(search)
    );
  });

  // Verifica si hay una máquina que coincida exactamente con la búsqueda
  protected readonly maquinaExacta = computed(() => {
    const search = this.searchMaquina().toLowerCase().trim();
    if (!search) return null;

    return this.maquinas().find((m) => m.nombre.toLowerCase() === search);
  });

  // Valor seleccionado en el mat-select (puede ser ID o null)
  protected readonly maquinaSeleccionada = computed(() => {
    return this.maquinaId();
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

  // Validaciones de campos obligatorios
  protected readonly camposObligatoriosCompletos = computed(() => {
    return (
      this.fechaInicio() !== null &&
      this.horaInicio() !== null &&
      this.numSerie().trim().length > 0 &&
      this.maquinaNombre().trim().length > 0
    );
  });

  // Validación de errores cuando ya existe inspección
  protected readonly errorNumSerie = computed(() => {
    const inspeccion = this.inspeccionService.currentInspeccion();
    return inspeccion && this.numSerie().trim().length === 0
      ? 'El número de serie es obligatorio'
      : null;
  });

  protected readonly errorMaquina = computed(() => {
    const inspeccion = this.inspeccionService.currentInspeccion();
    return inspeccion && this.maquinaNombre().trim().length === 0
      ? 'La máquina es obligatoria'
      : null;
  });

  // Se puede agregar checklist solo si la inspección ya fue creada
  protected readonly puedeAgregarChecklist = computed(() => {
    return this.inspeccionService.currentInspeccion() !== null;
  });

  // Validaciones completas para terminar
  protected readonly formularioValido = computed(() => {
    return (
      this.camposObligatoriosCompletos() &&
      this.checklists().length > 0 &&
      this.checklists().every((c) => c.templateId > 0) // No placeholders
    );
  });

  // Combinar fecha y hora en un solo Date
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
    // Validar permisos antes de cargar datos
    if (!this.validarPermisos()) {
      return;
    }

    this.inspeccionService.limpiarEstado();
    await this.cargarDatos();
  }

  ngOnDestroy() {
    this.inspeccionService.limpiarEstado();
  }

  /**
   * Validar que el usuario tenga nivel 3+ para crear inspecciones
   */
  private validarPermisos(): boolean {
    const userLevel = this.authService.user()?.cargo?.nivel ?? 0;

    if (userLevel < 3) {
      alert('No tienes permisos para crear inspecciones. Se requiere nivel 3 o superior.');
      this.router.navigate(['/historial']);
      return false;
    }

    return true;
  }

  /**
   * Cerrar el banner de error
   */
  protected cerrarError(): void {
    this.inspeccionService.limpiarError();
  }

  private async cargarDatos(): Promise<void> {
    const [maquinas, usuarios, templates] = await Promise.all([
      this.inspeccionService.obtenerMaquinas(),
      this.inspeccionService.obtenerUsuarios(),
      this.obtenerTemplates(),
    ]);

    this.maquinas.set(maquinas);
    this.usuarios.set(usuarios);
    this.templatesDisponibles.set(templates);
  }

  private async obtenerTemplates(): Promise<ChecklistTemplate[]> {
    return this.inspeccionService.obtenerTemplates();
  }

  protected agregarChecklist(): void {
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

    const inspeccion = this.inspeccionService.currentInspeccion();

    // Si ya existe la inspección, agregar al backend
    if (inspeccion) {
      const agregado = await this.inspeccionService.agregarTemplateAInspeccion(
        inspeccion.id,
        template.id
      );

      if (!agregado) return;
    }

    // Actualizar localmente
    await this.inspeccionService.reemplazarChecklist(checklistIndex, template);

    // Auto-guardar si ya existe inspección (por si acaso hay otros cambios)
    await this.autoGuardarSiExiste();
  }

  protected isChecklistSelected(templateId: number): boolean {
    return this.selectedTemplateIds().includes(templateId);
  }

  protected async eliminarChecklist(index: number): Promise<void> {
    const inspeccion = this.inspeccionService.currentInspeccion();
    const checklist = this.checklists()[index];

    // Si ya existe la inspección y no es un placeholder, eliminar del backend
    if (inspeccion && checklist && checklist.templateId > 0) {
      const eliminado = await this.inspeccionService.eliminarTemplateDeInspeccion(
        inspeccion.id,
        checklist.templateId
      );

      if (!eliminado) return;
    }

    // Eliminar localmente
    await this.inspeccionService.eliminarChecklist(index);

    // Auto-guardar si ya existe inspección
    await this.autoGuardarSiExiste();
  }

  /**
   * Se llama cuando el usuario sale del campo Número de Serie
   */
  protected async onNumSerieBlur(): Promise<void> {
    await this.intentarCrearInspeccion();
  }

  /**
   * Se llama cuando cambia el número de serie
   */
  protected async onNumSerieChange(): Promise<void> {
    await this.autoGuardarSiExiste();
  }

  /**
   * Se llama cuando el usuario selecciona una opción en el mat-select de máquina
   */
  protected async onMaquinaSelectionChange(valor: number | string): Promise<void> {
    // Si es un número, es una máquina existente
    if (typeof valor === 'number') {
      const maquina = this.maquinas().find((m) => m.id === valor);
      if (maquina) {
        this.maquinaId.set(maquina.id);
        this.maquinaNombre.set(maquina.nombre);
      }
      await this.intentarCrearInspeccion();
      return;
    }

    // Si es string y comienza con '__NUEVA__:', crear nueva máquina
    if (typeof valor === 'string' && valor.startsWith('__NUEVA__:')) {
      const nombreNuevo = valor.replace('__NUEVA__:', '').trim();
      await this.crearNuevaMaquina(nombreNuevo);
    }
  }

  /**
   * Crea una nueva máquina y la selecciona
   */
  private async crearNuevaMaquina(nombre: string): Promise<void> {
    if (!nombre) return;

    const nuevaMaquina = await this.inspeccionService.crearMaquina(nombre);

    if (nuevaMaquina) {
      // Agregar a la lista local
      this.maquinas.update((maquinas) => [...maquinas, nuevaMaquina]);
      // Seleccionar la nueva máquina
      this.maquinaId.set(nuevaMaquina.id);
      this.maquinaNombre.set(nuevaMaquina.nombre);
      // Limpiar búsqueda
      this.searchMaquina.set('');
      // Intentar crear la inspección
      await this.intentarCrearInspeccion();
    }
  }

  /**
   * Se llama cuando cambia la fecha o hora de inicio
   */
  protected async onFechaHoraChange(): Promise<void> {
    await this.autoGuardarSiExiste();
  }

  /**
   * Se llama cuando cambia nSerieMotor
   */
  protected async onNSerieMotorChange(): Promise<void> {
    await this.autoGuardarSiExiste();
  }

  /**
   * Se llama cuando cambia cabinado
   */
  protected async onCabinadoChange(): Promise<void> {
    const inspeccion = this.inspeccionService.currentInspeccion();
    if (inspeccion) {
      // Guardado inmediato para selects
      await this.inspeccionService.actualizar(inspeccion.id, {
        cabinado: this.cabinado() ?? undefined,
      });
    }
  }

  /**
   * Se llama cuando cambia horometro
   */
  protected async onHorometroChange(): Promise<void> {
    await this.autoGuardarSiExiste();
  }

  /**
   * Se llama cuando cambia el supervisor
   */
  protected async onSupervisorChange(): Promise<void> {
    const inspeccion = this.inspeccionService.currentInspeccion();
    if (!inspeccion) return;

    const supervisorIdActual = this.supervisorId();
    const asignacionesActuales = inspeccion.asignaciones || [];

    // Obtener el supervisor asignado anteriormente (rol Supervisor = ID 3)
    const supervisorAnterior = asignacionesActuales.find(
      (a) => a.rolAsignacion?.nombre === 'Supervisor' || a.rolAsignacion?.id === 3
    );

    // Si se quitó el supervisor (null)
    if (supervisorIdActual === null && supervisorAnterior) {
      await this.inspeccionService.eliminarAsignacion(inspeccion.id, supervisorAnterior.usuarioId);
      return;
    }

    // Si se asignó un nuevo supervisor
    if (supervisorIdActual !== null) {
      // Si es diferente al anterior, primero eliminar el anterior
      if (supervisorAnterior && supervisorAnterior.usuarioId !== supervisorIdActual) {
        await this.inspeccionService.eliminarAsignacion(
          inspeccion.id,
          supervisorAnterior.usuarioId
        );
      }

      // Asignar el nuevo supervisor (Rol ID 3 = Supervisor)
      await this.inspeccionService.asignarUsuario(inspeccion.id, supervisorIdActual, 3);
    }
  }

  /**
   * Se llama cuando cambian los técnicos
   */
  protected async onTecnicosChange(): Promise<void> {
    const inspeccion = this.inspeccionService.currentInspeccion();
    if (!inspeccion) return;

    const tecnicoIdsActuales = this.tecnicoIds();
    const asignacionesActuales = inspeccion.asignaciones || [];

    // Obtener IDs de técnicos que ya están asignados (rol Técnico = ID 2)
    const tecnicosAsignadosAntes = asignacionesActuales
      .filter((a) => a.rolAsignacion?.nombre === 'Técnico' || a.rolAsignacion?.id === 2)
      .map((a) => a.usuarioId);

    // Agregar nuevos técnicos
    const tecnicosAAgregar = tecnicoIdsActuales.filter(
      (id) => !tecnicosAsignadosAntes.includes(id)
    );
    for (const tecnicoId of tecnicosAAgregar) {
      // Rol ID 2 = Técnico (según seed)
      await this.inspeccionService.asignarUsuario(inspeccion.id, tecnicoId, 2);
    }

    // Eliminar técnicos deseleccionados
    const tecnicosAEliminar = tecnicosAsignadosAntes.filter(
      (id) => !tecnicoIdsActuales.includes(id)
    );
    for (const tecnicoId of tecnicosAEliminar) {
      await this.inspeccionService.eliminarAsignacion(inspeccion.id, tecnicoId);
    }
  }

  /**
   * Auto-guarda los cambios si ya existe una inspección creada
   * Cancela el timeout anterior y programa un nuevo guardado
   */
  private async autoGuardarSiExiste(): Promise<void> {
    const inspeccion = this.inspeccionService.currentInspeccion();
    if (!inspeccion) return;

    // Cancelar el timeout anterior si existe
    if (this.autoGuardadoTimeout !== null) {
      clearTimeout(this.autoGuardadoTimeout);
    }

    // Programar nuevo guardado después de 1.5 segundos
    this.autoGuardadoTimeout = window.setTimeout(async () => {
      await this.inspeccionService.actualizar(inspeccion.id, {
        fechaInicio: this.fechaHoraInicio().toISOString(),
        numSerie: this.numSerie(),
        nSerieMotor: this.nSerieMotor() || undefined,
        cabinado: this.cabinado() ?? undefined,
        horometro: this.horometro() ?? undefined,
      });
      this.autoGuardadoTimeout = null;
    }, 1500);
  }

  /**
   * Intenta crear la inspección si aún no existe y hay datos mínimos
   * Se llama desde eventos específicos: blur de numSerie, selección de máquina, agregar checklist
   */
  private async intentarCrearInspeccion(): Promise<void> {
    // Si ya existe inspección, no hacer nada
    if (this.inspeccionService.currentInspeccion()) return;

    // Verificar que tengamos datos mínimos para crear
    if (!this.datosMinimosParaCrear()) {
      return;
    }

    await this.crearInspeccionInicial();
  }

  /**
   * Verifica si tenemos los datos mínimos necesarios para crear la inspección
   * Requiere: fechaInicio, maquinaId y numSerie
   */
  private datosMinimosParaCrear(): boolean {
    return this.camposObligatoriosCompletos();
  }

  /**
   * Crea la inspección inicial en el backend
   */
  private async crearInspeccionInicial(): Promise<void> {
    // Evitar creación si ya existe
    if (this.inspeccionService.currentInspeccion()) {
      return;
    }

    // Asegurar que tenemos maquinaId
    if (!this.maquinaId()) {
      return;
    }

    const data = {
      fechaInicio: this.fechaHoraInicio().toISOString(),
      numSerie: this.numSerie(),
      maquinaId: this.maquinaId()!,
      nSerieMotor: this.nSerieMotor() || undefined,
      cabinado: this.cabinado() ?? undefined,
      horometro: this.horometro() ?? undefined,
      templateIds: this.selectedTemplateIds(),
    };

    const inspeccionCreada = await this.inspeccionService.crear(data);

    // Si se creó correctamente, asignar supervisor y técnicos
    if (inspeccionCreada) {
      await this.asignarUsuariosIniciales(inspeccionCreada.id);
    }
  }

  /**
   * Asigna supervisor y técnicos a la inspección recién creada
   */
  private async asignarUsuariosIniciales(inspeccionId: number): Promise<void> {
    const supervisorId = this.supervisorId();
    const tecnicoIds = this.tecnicoIds();

    // Asignar supervisor si fue seleccionado
    if (supervisorId !== null) {
      await this.inspeccionService.asignarUsuario(inspeccionId, supervisorId, 3);
    }

    // Asignar técnicos si fueron seleccionados
    for (const tecnicoId of tecnicoIds) {
      await this.inspeccionService.asignarUsuario(inspeccionId, tecnicoId, 2);
    }
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
      this.router.navigate(['/dashboard']);
    }
  }

  protected confirmarSalir(): void {
    this.showConfirmSalir.set(false);
    this.router.navigate(['/dashboard']);
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

    const inspeccion = this.inspeccionService.currentInspeccion();

    if (!inspeccion) {
      // Si por alguna razón no hay inspección creada, no se puede terminar
      // Esto no debería suceder ya que puedeTerminar() valida que exista
      return;
    }

    // Terminar la inspección existente
    await this.inspeccionService.terminar(inspeccion.id);
    this.router.navigate(['/historial']);
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

  protected parseFloat(value: string): number {
    return parseFloat(value);
  }
}
