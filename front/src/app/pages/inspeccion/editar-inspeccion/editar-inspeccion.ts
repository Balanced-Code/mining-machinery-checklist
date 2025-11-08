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
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { DatePicker } from 'primeng/datepicker';
import { filter } from 'rxjs';
import { ChecklistTemplate } from '../../../core/models/checklist.model';
import {
  InspeccionItemDTO,
  Maquina,
  Observacion,
  UsuarioInspeccion,
} from '../../../core/models/inspeccion.model';
import { AuthService } from '../../../core/services/auth.service';
import { InspeccionService } from '../../../core/services/inspeccion.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { ObservacionDialog } from '../../../shared/components/observacion-dialog/observacion-dialog';

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
  private readonly inspeccionService = inject(InspeccionService);
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

  protected readonly puedeTerminar = computed(() => {
    return this.formularioValido() && this.resumen().completado;
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
  }

  ngOnDestroy() {
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

  private poblarFormulario(inspeccion: {
    fechaInicio: string;
    fechaFinalizacion: string | null;
    numSerie: string;
    maquinaId: number;
  }): void {
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

    // TODO: Cargar supervisor y técnicos cuando el modelo lo soporte
    // this.supervisorId.set(inspeccion.supervisorId);
    // this.tecnicoIds.set(inspeccion.tecnicoIds);
  }

  private async obtenerTemplates(): Promise<ChecklistTemplate[]> {
    // TODO: Obtener del backend
    return [
      {
        id: 1,
        titulo: 'Revisión de cabina y controles',
        items: [
          { id: 1, orden: 1, descripcion: 'Limpieza y orden de la cabina.' },
          { id: 2, orden: 2, descripcion: 'Estado de espejos y cámaras.' },
          { id: 3, orden: 3, descripcion: 'Funcionamiento de luces y alarmas.' },
        ],
      },
      {
        id: 2,
        titulo: 'Sistema hidráulico',
        items: [
          { id: 4, orden: 1, descripcion: 'Nivel de aceite hidráulico.' },
          { id: 5, orden: 2, descripcion: 'Inspección de mangueras y conexiones.' },
        ],
      },
    ];
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
    await this.inspeccionService.reemplazarChecklist(checklistIndex, template);
  }

  protected isChecklistSelected(templateId: number): boolean {
    return this.selectedTemplateIds().includes(templateId);
  }

  protected async eliminarChecklist(index: number): Promise<void> {
    await this.inspeccionService.eliminarChecklist(index);
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

    // TODO: Guardar en backend
    console.log('Actualizando inspección...', {
      id,
      fechaInicio: this.fechaHoraInicio().toISOString(),
      numSerie: this.numSerie(),
      maquinaId: this.maquinaId(),
      supervisorId: this.supervisorId(),
      tecnicoIds: this.tecnicoIds(),
      checklists: this.checklists(),
    });

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
