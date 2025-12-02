import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Inspeccion } from '@core/models/inspeccion.model';
import { InspeccionesService } from '@core/services/inspecciones.service';
import { MaquinariaService } from '@core/services/maquinaria.service';

@Component({
  selector: 'app-dashboard',
  imports: [MatIconModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  private readonly inspeccionesService = inject(InspeccionesService);
  private readonly maquinariaService = inject(MaquinariaService);
  private readonly router = inject(Router);

  // ============================================================================
  // ESTADO
  // ============================================================================

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  // ============================================================================
  // COMPUTED - ESTADÍSTICAS
  // ============================================================================

  /**
   * Total de inspecciones completadas (con fecha de finalización)
   */
  protected readonly totalInspeccionesCompletadas = computed(() => {
    return this.inspeccionesService
      .inspecciones()
      .filter((insp) => insp.fechaFinalizacion !== null && !insp.eliminadoEn).length;
  });

  /**
   * Total de máquinas disponibles
   */
  protected readonly totalMaquinarias = computed(() => {
    return this.maquinariaService.maquinas().length;
  });

  /**
   * Últimas 5 inspecciones (sin importar estado)
   */
  protected readonly ultimasInspecciones = computed(() => {
    const inspecciones = this.inspeccionesService
      .inspecciones()
      .filter((insp) => !insp.eliminadoEn)
      .sort((a, b) => {
        // Ordenar por fecha de inicio descendente (más reciente primero)
        const fechaA = new Date(a.fechaInicio).getTime();
        const fechaB = new Date(b.fechaInicio).getTime();
        return fechaB - fechaA;
      });

    return inspecciones.slice(0, 5);
  });

  /**
   * Verificar si una inspección está completada
   */
  protected isCompletada(inspeccion: Inspeccion): boolean {
    return inspeccion.fechaFinalizacion !== null;
  }

  /**
   * Obtener clase de badge según estado
   */
  protected getBadgeClass(inspeccion: Inspeccion): string {
    return this.isCompletada(inspeccion) ? 'badge-completed' : 'badge-in-progress';
  }

  /**
   * Obtener texto del estado
   */
  protected getEstadoText(inspeccion: Inspeccion): string {
    return this.isCompletada(inspeccion) ? 'Completada' : 'En progreso';
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  async ngOnInit(): Promise<void> {
    await this.cargarDatos();
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  private async cargarDatos(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Cargar inspecciones y maquinaria en paralelo
      await Promise.all([
        this.inspeccionesService.getAll(),
        this.maquinariaService.obtenerMaquinas(),
      ]);
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err);
      this.error.set('Error al cargar los datos del dashboard');
    } finally {
      this.loading.set(false);
    }
  }

  // ============================================================================
  // FORMATEO DE DATOS
  // ============================================================================

  /**
   * Formatear fecha para mostrar día
   */
  protected formatearFechaDia(fecha: string | null): string {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  /**
   * Formatear fecha para mostrar hora
   */
  protected formatearFechaHora(fecha: string | null): string {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ============================================================================
  // NAVEGACIÓN
  // ============================================================================

  /**
   * Ver detalle de una inspección
   */
  protected verDetalle(inspeccion: Inspeccion): void {
    this.router.navigate(['/inspeccion/ver', inspeccion.id]);
  }

  /**
   * Navegar al historial completo
   */
  protected verHistorialCompleto(): void {
    this.router.navigate(['/historial']);
  }

  /**
   * Crear nueva inspección
   */
  protected crearInspeccion(): void {
    this.router.navigate(['/inspeccion/crear']);
  }
}
