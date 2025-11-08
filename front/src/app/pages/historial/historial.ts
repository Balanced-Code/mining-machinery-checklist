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
} from '../../core/models/inspeccion.model';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';

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

    // 2. Filtro por estado (completadas vs en progreso)
    if (estado === 'completadas') {
      resultado = resultado.filter((insp) => insp.fechaFinalizacion !== null);
    } else if (estado === 'en_progreso') {
      resultado = resultado.filter((insp) => insp.fechaFinalizacion === null);
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
    this.loadMockData();
  }

  // ============================================================================
  // ACCIONES DE TABLA
  // ============================================================================

  /**
   * Ver detalles de una inspección (solo lectura)
   */
  protected verInspeccion(inspeccion: Inspeccion): void {
    console.log('Ver inspección:', inspeccion);
    // TODO: Navegar a página de visualización
    // this.router.navigate(['/inspeccion', inspeccion.id, 'ver']);
  }

  /**
   * Editar una inspección
   */
  protected editarInspeccion(inspeccion: Inspeccion): void {
    if (!this.canEdit()) return;
    console.log('Editar inspección:', inspeccion);
    // TODO: Navegar a página de edición
    // this.router.navigate(['/inspeccion', inspeccion.id, 'editar']);
  }

  /**
   * Descargar reporte de inspección (exportar a Excel)
   */
  protected descargarInspeccion(inspeccion: Inspeccion): void {
    console.log('Descargar inspección:', inspeccion);
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
  protected confirmDelete(): void {
    const inspeccion = this.inspeccionToDelete();
    if (!inspeccion) return;

    // TODO: Llamar al servicio para eliminar
    console.log('Eliminando inspección:', inspeccion);

    // Por ahora solo removemos del estado local
    this.inspecciones.update((inspecciones) => inspecciones.filter((i) => i.id !== inspeccion.id));

    this.cancelDelete();
  }

  /**
   * Cancelar eliminación
   */
  protected cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.inspeccionToDelete.set(undefined);
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

  // ============================================================================
  // MOCK DATA (temporal hasta que backend esté listo)
  // ============================================================================

  private loadMockData(): void {
    const mockInspecciones: Inspeccion[] = [
      {
        id: 1,
        numSerie: 'EQA-2232',
        maquinaId: 1,
        maquina: { id: 1, nombre: 'CAT 320D' },
        fechaInicio: '2025-01-14T08:30:00',
        fechaFinalizacion: '2025-01-14T16:45:00',
        inspector: { id: 1, nombre: 'Juan Pérez', correo: 'juan@example.com' },
        creadoPor: 1,
        creadoEn: new Date('2025-01-14T08:30:00'),
      },
      {
        id: 2,
        numSerie: 'EQA-0332',
        maquinaId: 2,
        maquina: { id: 2, nombre: 'VOLVO L90H' },
        fechaInicio: '2025-01-19T09:00:00',
        fechaFinalizacion: '2025-01-26T17:30:00',
        inspector: { id: 2, nombre: 'María González', correo: 'maria@example.com' },
        creadoPor: 2,
        creadoEn: new Date('2025-01-19T09:00:00'),
      },
      {
        id: 3,
        numSerie: 'EQA-0242',
        maquinaId: 3,
        maquina: { id: 3, nombre: 'GROVE RT530E' },
        fechaInicio: '2025-01-21T07:15:00',
        fechaFinalizacion: '2025-01-21T15:20:00',
        inspector: { id: 3, nombre: 'Carlos Ramírez', correo: 'carlos@example.com' },
        creadoPor: 3,
        creadoEn: new Date('2025-01-21T07:15:00'),
      },
      {
        id: 4,
        numSerie: 'EQA-3231',
        maquinaId: 4,
        maquina: { id: 4, nombre: 'SCANIA R450' },
        fechaInicio: '2025-01-09T10:00:00',
        fechaFinalizacion: '2025-01-19T18:00:00',
        inspector: { id: 4, nombre: 'Ana Torres', correo: 'ana@example.com' },
        creadoPor: 4,
        creadoEn: new Date('2025-01-09T10:00:00'),
      },
      {
        id: 5,
        numSerie: 'EQA-1252',
        maquinaId: 5,
        maquina: { id: 5, nombre: 'FURUKAWA F70' },
        fechaInicio: '2025-01-17T08:45:00',
        fechaFinalizacion: '2025-01-24T16:15:00',
        inspector: { id: 5, nombre: 'Luis Morales', correo: 'luis@example.com' },
        creadoPor: 5,
        creadoEn: new Date('2025-01-17T08:45:00'),
      },
      {
        id: 6,
        numSerie: 'EQA-0342',
        maquinaId: 6,
        maquina: { id: 6, nombre: 'ATLAS COPCO ROC L8' },
        fechaInicio: '2025-01-11T11:30:00',
        fechaFinalizacion: '2025-01-18T14:45:00',
        inspector: { id: 6, nombre: 'Patricia Vega', correo: 'patricia@example.com' },
        creadoPor: 6,
        creadoEn: new Date('2025-01-11T11:30:00'),
      },
      {
        id: 7,
        numSerie: 'EQA-6732',
        maquinaId: 7,
        maquina: { id: 7, nombre: 'KOMATSU D65EX' },
        fechaInicio: '2025-01-24T09:30:00',
        fechaFinalizacion: '2025-01-31T17:00:00',
        inspector: { id: 7, nombre: 'Roberto Silva', correo: 'roberto@example.com' },
        creadoPor: 7,
        creadoEn: new Date('2025-01-24T09:30:00'),
      },
      {
        id: 8,
        numSerie: 'EQA-2369',
        maquinaId: 8,
        maquina: { id: 8, nombre: 'BOBCAT S650' },
        fechaInicio: '2025-01-15T08:00:00',
        fechaFinalizacion: '2025-01-22T16:30:00',
        inspector: { id: 8, nombre: 'Elena Campos', correo: 'elena@example.com' },
        creadoPor: 8,
        creadoEn: new Date('2025-01-15T08:00:00'),
      },
      {
        id: 9,
        numSerie: 'EQA-2232',
        maquinaId: 9,
        maquina: { id: 9, nombre: 'JCB 4CX' },
        fechaInicio: '2025-01-23T10:15:00',
        fechaFinalizacion: '2025-02-17T15:45:00',
        inspector: { id: 1, nombre: 'Juan Pérez', correo: 'juan@example.com' },
        creadoPor: 1,
        creadoEn: new Date('2025-01-23T10:15:00'),
      },
      {
        id: 10,
        numSerie: 'EQA-0333',
        maquinaId: 10,
        maquina: { id: 10, nombre: 'BOMAG BW213' },
        fechaInicio: '2025-01-11T07:45:00',
        fechaFinalizacion: '2025-02-07T18:30:00',
        inspector: { id: 2, nombre: 'María González', correo: 'maria@example.com' },
        creadoPor: 2,
        creadoEn: new Date('2025-01-11T07:45:00'),
      },
      {
        id: 11,
        numSerie: 'EQA-9876',
        maquinaId: 11,
        maquina: { id: 11, nombre: 'HITACHI ZX350' },
        fechaInicio: '2025-02-01T09:00:00',
        fechaFinalizacion: null, // En progreso
        inspector: { id: 3, nombre: 'Carlos Ramírez', correo: 'carlos@example.com' },
        creadoPor: 3,
        creadoEn: new Date('2025-02-01T09:00:00'),
      },
      {
        id: 12,
        numSerie: 'EQA-5432',
        maquinaId: 12,
        maquina: { id: 12, nombre: 'LIEBHERR R956' },
        fechaInicio: '2025-02-05T08:30:00',
        fechaFinalizacion: null, // En progreso
        inspector: { id: 4, nombre: 'Ana Torres', correo: 'ana@example.com' },
        creadoPor: 4,
        creadoEn: new Date('2025-02-05T08:30:00'),
      },
      // Registros con el mismo día pero diferentes horas para probar ordenamiento
      {
        id: 13,
        numSerie: 'EQA-1111',
        maquinaId: 13,
        maquina: { id: 13, nombre: 'CAT 336F' },
        fechaInicio: '2025-01-15T14:30:00',
        fechaFinalizacion: '2025-01-15T18:45:00',
        inspector: { id: 5, nombre: 'Luis Morales', correo: 'luis@example.com' },
        creadoPor: 5,
        creadoEn: new Date('2025-01-15T14:30:00'),
      },
      {
        id: 14,
        numSerie: 'EQA-2222',
        maquinaId: 14,
        maquina: { id: 14, nombre: 'KOMATSU PC210' },
        fechaInicio: '2025-01-15T09:15:00',
        fechaFinalizacion: '2025-01-15T12:30:00',
        inspector: { id: 6, nombre: 'Patricia Vega', correo: 'patricia@example.com' },
        creadoPor: 6,
        creadoEn: new Date('2025-01-15T09:15:00'),
      },
      {
        id: 15,
        numSerie: 'EQA-3333',
        maquinaId: 15,
        maquina: { id: 15, nombre: 'VOLVO EC380' },
        fechaInicio: '2025-01-15T16:00:00',
        fechaFinalizacion: '2025-01-15T19:20:00',
        inspector: { id: 7, nombre: 'Roberto Silva', correo: 'roberto@example.com' },
        creadoPor: 7,
        creadoEn: new Date('2025-01-15T16:00:00'),
      },
    ];

    this.inspecciones.set(mockInspecciones);
  }
}
