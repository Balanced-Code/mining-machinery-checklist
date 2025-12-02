import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import {
  ColumnaOrdenable,
  DireccionOrdenamiento,
  EstadoInspeccion,
  FiltrosInspeccion,
  Inspeccion,
} from '@core/models/inspeccion.model';
import { AuthService } from '@core/services/auth.service';
import { InspeccionesService } from '@core/services/inspecciones.service';
import { ConfirmDialog } from '@shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-historial',
  imports: [FormsModule, MatIconModule, ConfirmDialog],
  templateUrl: './historial.html',
  styleUrl: './historial.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Historial {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly inspeccionesService = inject(InspeccionesService);

  // ============================================================================
  // ESTADO
  // ============================================================================

  protected readonly inspecciones = signal<Inspeccion[]>([]);
  protected readonly filtros = signal<FiltrosInspeccion>({
    busqueda: '',
    estado: 'todas',
    ordenamiento: {
      columna: null,
      direccion: null,
    },
  });

  // Paginación
  protected readonly paginaActual = signal(1);
  protected readonly itemsPorPagina = 10;

  // Estados de confirmación
  protected readonly showDeleteConfirm = signal(false);
  protected readonly inspeccionToDelete = signal<Inspeccion | undefined>(undefined);

  // Estado de exportación
  protected readonly exportandoId = signal<number | null>(null);

  // ============================================================================
  // PERMISOS
  // ============================================================================

  /**
   * Nivel 3+ puede editar y eliminar
   * Nivel 2- solo puede ver y descargar
   */
  protected readonly canEdit = computed(() => {
    return this.authService.hasRequiredLevel(3);
  });

  /**
   * Nivel 4 (admin) puede ver inspecciones eliminadas y reactivarlas
   */
  protected readonly isAdmin = computed(() => {
    return this.authService.hasRequiredLevel(4);
  });

  /**
   * Puede eliminar una inspección (nivel 3+)
   * El mensaje de confirmación variará según si está finalizada o no
   */
  protected readonly canDelete = computed(() => {
    return this.authService.hasRequiredLevel(3);
  });

  /**
   * Puede reactivar una inspección eliminada (solo nivel 4)
   */
  protected readonly canReactivate = computed(() => {
    return this.authService.hasRequiredLevel(4);
  });

  // ============================================================================
  // COMPUTED - FILTRADO Y ORDENAMIENTO
  // ============================================================================

  /**
   * Inspecciones filtradas por búsqueda y estado
   */
  protected readonly inspeccionesFiltradas = computed(() => {
    let resultado = this.inspecciones();
    const { busqueda, estado, ordenamiento } = this.filtros();

    // 1. Filtro por búsqueda (numSerie, máquina, inspector)
    if (busqueda.trim()) {
      const query = busqueda.toLowerCase();
      resultado = resultado.filter(
        (insp) =>
          insp.numSerie.toLowerCase().includes(query) ||
          insp.maquina?.nombre.toLowerCase().includes(query) ||
          insp.inspector?.nombre.toLowerCase().includes(query)
      );
    }

    // 2. Filtro por estado (completadas vs en progreso vs eliminadas)
    if (estado === 'completadas') {
      resultado = resultado.filter((insp) => insp.fechaFinalizacion !== null && !insp.eliminadoEn);
    } else if (estado === 'en_progreso') {
      resultado = resultado.filter((insp) => insp.fechaFinalizacion === null && !insp.eliminadoEn);
    } else if (estado === 'eliminadas') {
      resultado = resultado.filter((insp) => insp.eliminadoEn !== undefined);
    } else {
      // 'todas': excluir eliminadas a menos que sea admin
      if (!this.isAdmin()) {
        resultado = resultado.filter((insp) => !insp.eliminadoEn);
      }
    }

    // 3. Ordenamiento
    if (ordenamiento.columna && ordenamiento.direccion) {
      resultado = [...resultado].sort((a, b) => {
        let valorA: string | number;
        let valorB: string | number;

        switch (ordenamiento.columna) {
          case 'numSerie':
            valorA = a.numSerie;
            valorB = b.numSerie;
            break;
          case 'maquina':
            valorA = a.maquina?.nombre || '';
            valorB = b.maquina?.nombre || '';
            break;
          case 'fechaInicio':
            valorA = new Date(a.fechaInicio).getTime();
            valorB = new Date(b.fechaInicio).getTime();
            break;
          case 'fechaFinalizacion':
            valorA = a.fechaFinalizacion ? new Date(a.fechaFinalizacion).getTime() : 0;
            valorB = b.fechaFinalizacion ? new Date(b.fechaFinalizacion).getTime() : 0;
            break;
          case 'inspector':
            valorA = a.inspector?.nombre || '';
            valorB = b.inspector?.nombre || '';
            break;
          default:
            return 0;
        }

        if (typeof valorA === 'string' && typeof valorB === 'string') {
          return ordenamiento.direccion === 'asc'
            ? valorA.localeCompare(valorB)
            : valorB.localeCompare(valorA);
        }

        // Casting seguro para números
        const numA = valorA as number;
        const numB = valorB as number;
        return ordenamiento.direccion === 'asc' ? numA - numB : numB - numA;
      });
    }

    return resultado;
  });

  /**
   * Inspecciones paginadas
   */
  protected readonly inspeccionesPaginadas = computed(() => {
    const filtradas = this.inspeccionesFiltradas();
    const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return filtradas.slice(inicio, fin);
  });

  protected readonly totalPaginas = computed(() => {
    return Math.ceil(this.inspeccionesFiltradas().length / this.itemsPorPagina);
  });

  /**
   * Rango de páginas visibles (máximo 5 números)
   */
  protected readonly paginasVisibles = computed(() => {
    const total = this.totalPaginas();
    const actual = this.paginaActual();
    const paginas: number[] = [];

    if (total <= 5) {
      // Mostrar todas si son 5 o menos
      for (let i = 1; i <= total; i++) {
        paginas.push(i);
      }
    } else {
      // Mostrar 5 páginas centradas en la actual
      let inicio = Math.max(1, actual - 2);
      const fin = Math.min(total, inicio + 4);

      // Ajustar inicio si estamos cerca del final
      if (fin - inicio < 4) {
        inicio = fin - 4;
      }

      for (let i = inicio; i <= fin; i++) {
        paginas.push(i);
      }
    }

    return paginas;
  });

  /**
   * Verificar si hay filtros activos
   */
  protected readonly hayFiltrosActivos = computed(() => {
    const { busqueda, estado, ordenamiento } = this.filtros();
    return busqueda.trim() !== '' || estado !== 'todas' || ordenamiento.columna !== null;
  });

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  constructor() {
    this.loadInspecciones();
  }

  // ============================================================================
  // ACCIONES DE TABLA
  // ============================================================================

  /**
   * Ver detalles de una inspección (solo lectura)
   */
  protected verInspeccion(inspeccion: Inspeccion): void {
    this.router.navigate(['/inspeccion/ver', inspeccion.id]);
  }

  /**
   * Editar una inspección
   * Solo se puede editar si no está finalizada, excepto para administradores (nivel 4)
   */
  protected editarInspeccion(inspeccion: Inspeccion): void {
    if (!this.canEdit()) {
      alert('No tiene permisos para editar inspecciones.');
      return;
    }

    if (inspeccion.eliminadoEn) {
      alert('No se puede editar una inspección eliminada.');
      return;
    }

    // Si está finalizada y no es admin, bloquear
    if (inspeccion.fechaFinalizacion && !this.isAdmin()) {
      alert(
        'Esta inspección está finalizada y no puede ser editada. Solo los administradores pueden modificarla.'
      );
      return;
    }

    this.router.navigate(['/inspeccion/editar', inspeccion.id]);
  }

  /**
   * Obtener el título del botón de edición según el estado de la inspección
   */
  protected getEditButtonTitle(inspeccion: Inspeccion): string {
    if (!this.canEdit()) {
      return 'No tiene permisos para editar';
    }
    if (inspeccion.eliminadoEn) {
      return 'No se puede editar una inspección eliminada';
    }
    if (inspeccion.fechaFinalizacion && !this.isAdmin()) {
      return 'La inspección está finalizada. Solo los administradores pueden editarla';
    }
    return 'Editar inspección';
  }

  /**
   * Descargar reporte de inspección (exportar a Excel)
   */
  protected descargarInspeccion(inspeccion: Inspeccion): void {
    // TODO: Implementar exportación a Excel
    alert(`Funcionalidad de descarga pendiente para inspección ${inspeccion.numSerie}`);
  }

  /**
   * Eliminar inspección
   */
  protected eliminarInspeccion(inspeccion: Inspeccion): void {
    if (!this.canEdit()) return;
    this.inspeccionToDelete.set(inspeccion);
    this.showDeleteConfirm.set(true);
  }

  /**
   * Confirmar eliminación
   */
  protected async confirmDelete(): Promise<void> {
    const inspeccion = this.inspeccionToDelete();
    if (!inspeccion) return;

    try {
      const deleted = await this.inspeccionesService.delete(inspeccion.id);

      if (deleted) {
        // Actualizar estado local
        this.inspecciones.update((inspecciones) =>
          inspecciones.filter((i) => i.id !== inspeccion.id)
        );
      } else {
        alert('Error al eliminar la inspección');
      }
    } catch (error) {
      console.error('Error al eliminar inspección:', error);
      alert('Error al eliminar la inspección');
    } finally {
      this.cancelDelete();
    }
  }

  /**
   * Cancelar eliminación
   */
  protected cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.inspeccionToDelete.set(undefined);
  }

  /**
   * Reactivar inspección eliminada (solo admins)
   */
  protected async reactivarInspeccion(inspeccion: Inspeccion): Promise<void> {
    if (!this.canReactivate()) return;

    try {
      const reactivada = await this.inspeccionesService.reactivate(inspeccion.id);

      if (reactivada) {
        // Recargar la lista
        await this.loadInspecciones();
      } else {
        alert('Error al reactivar la inspección');
      }
    } catch (error) {
      console.error('Error al reactivar inspección:', error);
      alert('Error al reactivar la inspección');
    }
  }

  /**
   * Obtener mensaje de confirmación de eliminación
   */
  protected getDeleteMessage(): string {
    const inspeccion = this.inspeccionToDelete();
    if (!inspeccion) return '';

    if (inspeccion.fechaFinalizacion) {
      return `¿Estás seguro de que deseas eliminar la inspección ${inspeccion.numSerie}? Esta inspección está finalizada y se realizará una eliminación suave (puede ser reactivada por un administrador).`;
    } else {
      return `¿Estás seguro de que deseas eliminar la inspección ${inspeccion.numSerie}? Esta inspección NO está finalizada y se eliminará permanentemente junto con todos sus datos. Esta acción no se puede deshacer.`;
    }
  }

  /**
   * Crear nueva revisión
   */
  protected crearRevision(): void {
    this.router.navigate(['/inspeccion/crear']);
  }

  // ============================================================================
  // FILTROS Y ORDENAMIENTO
  // ============================================================================

  /**
   * Actualizar búsqueda
   */
  protected actualizarBusqueda(query: string): void {
    this.filtros.update((f) => ({ ...f, busqueda: query }));
    this.paginaActual.set(1); // Reset a primera página
  }

  /**
   * Cambiar filtro de estado
   */
  protected cambiarEstado(estado: EstadoInspeccion): void {
    this.filtros.update((f) => ({ ...f, estado }));
    this.paginaActual.set(1);
  }

  /**
   * Ordenar por columna
   */
  protected ordenarPor(columna: ColumnaOrdenable): void {
    this.filtros.update((f) => {
      const { ordenamiento } = f;

      let nuevaDireccion: DireccionOrdenamiento;

      if (ordenamiento.columna === columna) {
        // Misma columna: cambiar dirección (asc -> desc -> null)
        if (ordenamiento.direccion === 'asc') {
          nuevaDireccion = 'desc';
        } else if (ordenamiento.direccion === 'desc') {
          nuevaDireccion = null;
        } else {
          nuevaDireccion = 'asc';
        }
      } else {
        // Nueva columna: empezar con asc
        nuevaDireccion = 'asc';
      }

      return {
        ...f,
        ordenamiento: {
          columna: nuevaDireccion ? columna : null,
          direccion: nuevaDireccion,
        },
      };
    });
  }

  /**
   * Obtener dirección de ordenamiento para una columna
   */
  protected getDireccionOrdenamiento(columna: ColumnaOrdenable): DireccionOrdenamiento {
    const { ordenamiento } = this.filtros();
    return ordenamiento.columna === columna ? ordenamiento.direccion : null;
  }

  /**
   * Limpiar todos los filtros, búsqueda y ordenamiento
   */
  protected limpiarFiltros(): void {
    this.filtros.set({
      busqueda: '',
      estado: 'todas',
      ordenamiento: {
        columna: null,
        direccion: null,
      },
    });
    this.paginaActual.set(1);
  }

  // ============================================================================
  // PAGINACIÓN
  // ============================================================================

  protected irAPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas()) {
      this.paginaActual.set(pagina);
    }
  }

  protected paginaAnterior(): void {
    if (this.paginaActual() > 1) {
      this.paginaActual.update((p) => p - 1);
    }
  }

  protected paginaSiguiente(): void {
    if (this.paginaActual() < this.totalPaginas()) {
      this.paginaActual.update((p) => p + 1);
    }
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  /**
   * Formatear solo la fecha (DD/MM/YYYY)
   */
  protected formatearFechaDia(fecha: string | null): string {
    if (!fecha) return '-';

    const date = new Date(fecha);
    const dia = date.getDate().toString().padStart(2, '0');
    const mes = (date.getMonth() + 1).toString().padStart(2, '0');
    const anio = date.getFullYear();

    return `${dia}/${mes}/${anio}`;
  }

  /**
   * Formatear solo la hora (HH:mm)
   */
  protected formatearFechaHora(fecha: string | null): string {
    if (!fecha) return '';

    const date = new Date(fecha);
    const horas = date.getHours().toString().padStart(2, '0');
    const minutos = date.getMinutes().toString().padStart(2, '0');

    return `${horas}:${minutos}`;
  }

  /**
   * Formatear fecha completa a DD/MM/YYYY HH:mm (mantener por compatibilidad)
   */
  protected formatearFecha(fecha: string | null): string {
    if (!fecha) return '-';

    const date = new Date(fecha);
    const dia = date.getDate().toString().padStart(2, '0');
    const mes = (date.getMonth() + 1).toString().padStart(2, '0');
    const anio = date.getFullYear();
    const horas = date.getHours().toString().padStart(2, '0');
    const minutos = date.getMinutes().toString().padStart(2, '0');

    return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
  }

  /**
   * Obtener estado de inspección
   */
  protected getEstado(inspeccion: Inspeccion): string {
    return inspeccion.fechaFinalizacion ? 'Completada' : 'En progreso';
  }

  /**
   * Verificar si una inspección puede ser exportada
   */
  protected puedeExportar(inspeccion: Inspeccion): boolean {
    return inspeccion.fechaFinalizacion !== null && !inspeccion.eliminadoEn;
  }

  /**
   * Obtener título del botón de exportación
   */
  protected getExportButtonTitle(inspeccion: Inspeccion): string {
    if (inspeccion.eliminadoEn) {
      return 'No se puede exportar una inspección eliminada';
    }
    if (!inspeccion.fechaFinalizacion) {
      return 'Solo se pueden exportar inspecciones finalizadas';
    }
    return 'Exportar a Excel';
  }

  /**
   * Exportar inspección a Excel
   */
  protected async exportarInspeccion(inspeccion: Inspeccion): Promise<void> {
    if (!this.puedeExportar(inspeccion)) {
      return;
    }

    this.exportandoId.set(inspeccion.id);

    try {
      await this.inspeccionesService.exportarExcel(inspeccion.id);
    } catch (error) {
      console.error('Error al exportar inspección:', error);
    } finally {
      this.exportandoId.set(null);
    }
  }

  /**
   * Cargar inspecciones desde el backend
   */
  private async loadInspecciones(): Promise<void> {
    try {
      await this.inspeccionesService.getAll();
      // Sincronizar con el signal del servicio
      this.inspecciones.set(this.inspeccionesService.inspecciones());
    } catch (error) {
      console.error('Error al cargar inspecciones:', error);
    }
  }
}
