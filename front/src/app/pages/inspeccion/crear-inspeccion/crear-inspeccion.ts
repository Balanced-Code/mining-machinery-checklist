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
  private readonly inspeccionService = inject(InspeccionService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  // Estados del formulario
  protected readonly fechaInicio = signal<Date>(new Date());
  protected readonly horaInicio = signal<Date>(new Date());
  protected readonly numSerie = signal('');
  protected readonly maquinaId = signal<number | null>(null);
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

  protected readonly puedeTerminar = computed(() => {
    return this.formularioValido() && this.resumen().completado;
  });

  async ngOnInit() {
    this.inspeccionService.limpiarEstado();
    await this.cargarDatos();
  }
  ngOnDestroy() {
    this.inspeccionService.limpiarEstado();
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
    setTimeout(async () => {
      this.agregandoChecklist = false;
      // Intentar crear inspección si se agregó un checklist
      await this.intentarCrearInspeccion();
    }, 300);
  }

  protected async seleccionarTemplate(
    checklistIndex: number,
    template: ChecklistTemplate
  ): Promise<void> {
    if (this.isChecklistSelected(template.id)) return;
    await this.inspeccionService.reemplazarChecklist(checklistIndex, template);

    // Crear inspección en el backend si aún no existe y si tenemos los datos mínimos
    await this.crearInspeccionSiEsNecesario();
  }

  /**
   * Crea la inspección en el backend si aún no existe y si se cumplen las condiciones mínimas
   */
  private async crearInspeccionSiEsNecesario(): Promise<void> {
    // Solo crear si no existe una inspección activa
    if (this.inspeccionService.currentInspeccion()) return;

    // Verificar que tengamos los datos mínimos necesarios
    if (!this.datosMinimosParaCrear()) return;

    await this.crearInspeccionInicial();
  }

  protected isChecklistSelected(templateId: number): boolean {
    return this.selectedTemplateIds().includes(templateId);
  }

  protected async eliminarChecklist(index: number): Promise<void> {
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
   * Se llama cuando el usuario selecciona una máquina
   */
  protected async onMaquinaChange(): Promise<void> {
    await this.intentarCrearInspeccion();
  }

  /**
   * Auto-guarda los cambios si ya existe una inspección creada
   */
  private async autoGuardarSiExiste(): Promise<void> {
    const inspeccion = this.inspeccionService.currentInspeccion();
    if (inspeccion) {
      await this.inspeccionService.actualizar(inspeccion.id, {
        fechaInicio: this.fechaHoraInicio().toISOString(),
        numSerie: this.numSerie(),
      });
    }
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
   * Requiere al menos UNA acción significativa: numSerie o checklist
   */
  private datosMinimosParaCrear(): boolean {
    // Verificar que haya fecha y hora (campos con valores por defecto)
    if (!this.fechaInicio() || !this.horaInicio()) {
      return false;
    }

    // La máquina es obligatoria para crear la inspección
    if (!this.maquinaId()) {
      return false;
    }

    // Verificar que haya AL MENOS UNA acción significativa
    const tieneNumSerie = this.numSerie().trim().length > 0;
    const tieneChecklist = this.checklists().length > 0;

    return tieneNumSerie || tieneChecklist;
  }

  /**
   * Crea la inspección inicial en el backend
   */
  private async crearInspeccionInicial(): Promise<void> {
    // Evitar creación si ya existe
    if (this.inspeccionService.currentInspeccion()) {
      return;
    }

    const data = {
      fechaInicio: this.fechaHoraInicio().toISOString(),
      numSerie: this.numSerie() || undefined,
      maquinaId: this.maquinaId() || undefined,
      supervisorId: this.supervisorId() || undefined,
      tecnicoIds: this.tecnicoIds(),
      templateIds: this.selectedTemplateIds(),
      nSerieMotor: undefined,
      cabinado: undefined,
      horometro: undefined,
    };

    await this.inspeccionService.crear(data);
  }

  /**
   * Auto-guarda cambios en la información general
   */
  private autoGuardarCambios(inspeccion: Inspeccion): void {
    const fechaHora = this.fechaHoraInicio();
    const numSerie = this.numSerie();

    // Auto-guardar con debounce
    setTimeout(() => {
      this.inspeccionService.actualizar(inspeccion.id, {
        fechaInicio: fechaHora.toISOString(),
        numSerie: numSerie,
      });
    }, 500);
  }

  protected async onRespuestaChange(
    checklistIndex: number,
    itemIndex: number,
    cumple: boolean | null
  ): Promise<void> {
    const checklist = this.checklists()[checklistIndex];
    const item = checklist?.items[itemIndex];
    if (!checklist || !item) return;

    await this.inspeccionService.guardarRespuesta(checklist.templateId, {
      templateSeccionId: item.templateSeccionId,
      cumple,
      observacion: item.observacion
        ? {
            id: item.observacion.id,
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
      .subscribe(async (result: Omit<Observacion, 'id'>) => {
        await this.inspeccionService.guardarRespuesta(checklist.templateId, {
          templateSeccionId: item.templateSeccionId,
          cumple: item.cumple,
          observacion: {
            id: item.observacion?.id,
            ...result,
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
      // Si por alguna razón no hay inspección creada, crearla primero
      await this.crearInspeccionSiEsNecesario();
      const nuevaInspeccion = this.inspeccionService.currentInspeccion();

      if (!nuevaInspeccion) {
        // Si aún no se pudo crear, mostrar error
        return;
      }

      // Terminar la inspección recién creada
      await this.inspeccionService.terminar(nuevaInspeccion.id);
    } else {
      // Terminar la inspección existente
      await this.inspeccionService.terminar(inspeccion.id);
    }

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
}
