import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Maquina, MaquinariaService } from '@core/services/maquinaria.service';
import { ConfirmDialog } from '@shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-maquinaria',
  imports: [MatIconModule, ConfirmDialog],
  templateUrl: './maquinaria.html',
  styleUrl: './maquinaria.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Maquinaria implements OnInit {
  protected readonly maquinariaService = inject(MaquinariaService);

  // Estados
  protected readonly searchQuery = signal('');
  protected readonly modoEdicion = signal<'crear' | 'editar' | null>(null);
  protected readonly maquinaEditando = signal<Maquina | null>(null);
  protected readonly nombreInput = signal('');
  protected readonly mostrarConfirmEliminar = signal(false);
  protected readonly maquinaAEliminar = signal<Maquina | null>(null);

  // Computed
  protected readonly maquinasFiltradas = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const maquinas = this.maquinariaService.maquinas();

    if (!query) return maquinas;

    return maquinas.filter((m) => m.nombre.toLowerCase().includes(query));
  });

  protected readonly hayFiltrosActivos = computed(() => {
    return this.searchQuery().length > 0;
  });

  protected readonly mensajeConfirmEliminar = computed(() => {
    const nombre = this.maquinaAEliminar()?.nombre || '';
    return `¿Estás seguro de eliminar la máquina "${nombre}"? Esta acción no se puede deshacer.`;
  });

  async ngOnInit() {
    await this.maquinariaService.obtenerMaquinas();
  }

  protected onSearch(value: string): void {
    this.searchQuery.set(value);
  }

  protected limpiarFiltros(): void {
    this.searchQuery.set('');
  }

  protected abrirModalCrear(): void {
    this.modoEdicion.set('crear');
    this.nombreInput.set('');
    this.maquinariaService.limpiarError();
  }

  protected abrirModalEditar(maquina: Maquina): void {
    // Verificar si está en uso
    if (maquina._count && maquina._count.inspecciones > 0) {
      return;
    }

    this.modoEdicion.set('editar');
    this.maquinaEditando.set(maquina);
    this.nombreInput.set(maquina.nombre);
    this.maquinariaService.limpiarError();
  }

  protected cerrarModal(): void {
    this.modoEdicion.set(null);
    this.maquinaEditando.set(null);
    this.nombreInput.set('');
    this.maquinariaService.limpiarError();
  }

  protected async guardar(): Promise<void> {
    const nombre = this.nombreInput().trim();
    if (!nombre) return;

    if (this.modoEdicion() === 'crear') {
      const resultado = await this.maquinariaService.crearMaquina(nombre);
      if (resultado) {
        this.cerrarModal();
      }
    } else if (this.modoEdicion() === 'editar' && this.maquinaEditando()) {
      const resultado = await this.maquinariaService.actualizarMaquina(
        this.maquinaEditando()!.id,
        nombre
      );
      if (resultado) {
        this.cerrarModal();
      }
    }
  }

  protected async eliminar(maquina: Maquina): Promise<void> {
    // Verificar si está en uso
    if (maquina._count && maquina._count.inspecciones > 0) {
      return;
    }

    // Mostrar modal de confirmación
    this.maquinaAEliminar.set(maquina);
    this.mostrarConfirmEliminar.set(true);
  }

  protected async confirmarEliminar(): Promise<void> {
    const maquina = this.maquinaAEliminar();
    if (!maquina) return;

    await this.maquinariaService.eliminarMaquina(maquina.id);
    this.cancelarEliminar();
  }

  protected cancelarEliminar(): void {
    this.mostrarConfirmEliminar.set(false);
    this.maquinaAEliminar.set(null);
  }

  protected cerrarError(): void {
    this.maquinariaService.limpiarError();
  }

  protected estaEnUso(maquina: Maquina): boolean {
    return !!(maquina._count && maquina._count.inspecciones > 0);
  }
}
