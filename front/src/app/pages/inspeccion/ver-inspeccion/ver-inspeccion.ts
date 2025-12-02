import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { Archivo, Maquina, UsuarioInspeccion } from '@core/models/inspeccion.model';
import { ArchivoService } from '@core/services/archivo.service';
import { AuthService } from '@core/services/auth.service';
import { InspeccionService } from '@core/services/inspeccion.service';
import { ObservacionDialog } from '@shared/components/observacion-dialog/observacion-dialog';

@Component({
  selector: 'app-ver-inspeccion',
  imports: [MatIconModule],
  templateUrl: './ver-inspeccion.html',
  styleUrl: './ver-inspeccion.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerInspeccion implements OnInit, OnDestroy {
  private readonly inspeccionService = inject(InspeccionService);
  protected readonly archivoService = inject(ArchivoService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);

  // ID de la inspección a ver
  private readonly inspeccionId = signal<number | null>(null);

  // Estados del formulario (readonly)
  protected readonly fechaInicio = signal<Date>(new Date());
  protected readonly horaInicio = signal<Date>(new Date());
  protected readonly fechaFin = signal<Date | null>(null);
  protected readonly horaFin = signal<Date | null>(null);
  protected readonly numSerie = signal('');
  protected readonly maquinaNombre = signal('');
  protected readonly supervisorNombre = signal('');
  protected readonly tecnicosNombres = signal<string[]>([]);
  protected readonly inspectorNombre = signal('');
  protected readonly nSerieMotor = signal<string | null>(null);
  protected readonly cabinado = signal<boolean | null>(null);
  protected readonly horometro = signal<number | null>(null);

  // Datos cargados
  protected readonly maquinas = signal<Maquina[]>([]);
  protected readonly usuarios = signal<UsuarioInspeccion[]>([]);

  // Computed del servicio
  protected readonly checklists = this.inspeccionService.checklists;
  protected readonly resumen = this.inspeccionService.resumen;
  protected readonly loading = this.inspeccionService.loading;

  // Usuario actual
  protected readonly inspector = this.authService.user;

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

  // Formato de fecha/hora inicio para mostrar
  protected readonly fechaInicioFormateada = computed(() => {
    const fechaHora = this.fechaHoraInicio();
    return fechaHora.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  // Estado de la inspección
  protected readonly estadoInspeccion = computed(() => {
    return this.fechaFin() ? 'Completada' : 'En Progreso';
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
    const [maquinas, usuarios] = await Promise.all([
      this.inspeccionService.obtenerMaquinas(),
      this.inspeccionService.obtenerUsuarios(),
    ]);

    this.maquinas.set(maquinas);
    this.usuarios.set(usuarios);

    // Cargar la inspección específica
    const inspeccion = await this.inspeccionService.obtenerPorId(id);
    if (!inspeccion) {
      // Si no se encuentra, redirigir
      this.router.navigate(['/historial']);
      return;
    }

    // Cargar checklists de la inspección
    await this.inspeccionService.cargarChecklists(id);

    // Poblar los datos para visualización
    this.poblarDatos(inspeccion);
  }

  private poblarDatos(inspeccion: {
    fechaInicio: string;
    fechaFinalizacion: string | null;
    numSerie: string;
    maquinaId: number;
    nSerieMotor?: string | null;
    cabinado?: boolean | null;
    horometro?: number | null;
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

    // Campos adicionales de la máquina
    this.nSerieMotor.set(inspeccion.nSerieMotor ?? null);
    this.cabinado.set(inspeccion.cabinado ?? null);
    this.horometro.set(inspeccion.horometro ?? null);

    // Buscar nombre de la máquina
    const maquina = this.maquinas().find((m) => m.id === inspeccion.maquinaId);
    if (maquina) {
      this.maquinaNombre.set(maquina.nombre);
    }

    // TODO: Cargar supervisor y técnicos cuando el modelo lo soporte
    // const supervisor = this.usuarios().find(u => u.id === inspeccion.supervisorId);
    // if (supervisor) {
    //   this.supervisorNombre.set(this.formatUsuario(supervisor));
    // }

    // TODO: Cargar técnicos
    // const tecnicos = this.usuarios().filter(u => inspeccion.tecnicoIds?.includes(u.id));
    // this.tecnicosNombres.set(tecnicos.map(t => this.formatUsuario(t)));

    // Inspector (usuario actual por ahora)
    const user = this.inspector();
    if (user) {
      this.inspectorNombre.set(this.formatUsuario(user));
    }
  }

  protected salir(): void {
    this.router.navigate(['/historial']);
  }

  protected formatUsuario(usuario: UsuarioInspeccion): string {
    return `${usuario.nombre} (${usuario.correo})`;
  }

  /**
   * Descarga un archivo adjunto
   */
  protected descargarArchivo(archivo: Archivo): void {
    this.archivoService.descargarArchivo(archivo.id);
  }

  /**
   * Obtiene la URL de visualización de un archivo
   */
  protected getArchivoUrl(archivo: Archivo): string {
    if (archivo.url) {
      return archivo.url;
    }
    if (archivo.ruta) {
      return this.archivoService.getUrlVisualizacion(archivo.ruta);
    }
    return '';
  }

  /**
   * Verifica si un archivo es una imagen
   */
  protected esImagen(archivo: Archivo): boolean {
    return archivo.tipo.startsWith('image/');
  }

  /**
   * Abre el diálogo de observación en modo visualización
   */
  protected abrirObservacion(checklistIndex: number, itemIndex: number): void {
    const checklist = this.checklists()[checklistIndex];
    if (!checklist) return;

    const item = checklist.items[itemIndex];
    if (!item || !item.observacion) return;

    this.dialog.open(ObservacionDialog, {
      width: '600px',
      maxHeight: '90vh',
      data: {
        itemDescripcion: item.descripcion,
        observacionInicial: item.observacion,
        modo: 'ver',
        requiereObservacion: false,
      },
    });
  }
}
