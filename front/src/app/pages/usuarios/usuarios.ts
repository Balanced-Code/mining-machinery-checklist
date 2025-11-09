import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  Cargo,
  CreateUsuarioRequest,
  UpdateUsuarioRequest,
  User,
  UserDialogMode,
} from '@core/models/user.model';
import { ConfirmDialog } from '@shared/components/confirm-dialog/confirm-dialog';
import { getCargoColors } from '@shared/utils/cargo-colors.util';
import { UserDialog } from './user-dialog/user-dialog';

// Tipos para ordenamiento
type ColumnaOrdenable = 'nombre' | 'correo' | 'cargo';
type DireccionOrdenamiento = 'asc' | 'desc' | null;

interface Ordenamiento {
  columna: ColumnaOrdenable | null;
  direccion: DireccionOrdenamiento;
}

@Component({
  selector: 'app-usuarios',
  imports: [FormsModule, MatIconModule, UserDialog, ConfirmDialog],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Usuarios {
  // Signals para estado
  protected users = signal<User[]>([]);
  protected loading = signal(false);
  protected searchQuery = signal('');
  protected selectedCargoId = signal<number | null>(null);
  protected ordenamiento = signal<Ordenamiento>({
    columna: null,
    direccion: null,
  });

  // Dialog state
  protected showDialog = signal(false);
  protected dialogMode = signal<UserDialogMode>('create');
  protected selectedUser = signal<User | undefined>(undefined);

  // Confirm dialogs
  protected showResetConfirm = signal(false);
  protected showDeleteConfirm = signal(false);
  protected userToReset = signal<User | undefined>(undefined);
  protected userToDelete = signal<User | undefined>(undefined);

  // Cargos disponibles para el select
  protected cargos = signal<Cargo[]>([
    { id: 1, nombre: 'Operador', nivel: 1 },
    { id: 2, nombre: 'Técnico Mecánico', nivel: 2 },
    { id: 3, nombre: 'Supervisor', nivel: 2 },
    { id: 4, nombre: 'Inspector', nivel: 3 },
    { id: 5, nombre: 'Administrador', nivel: 4 },
  ]);

  // Computed: usuarios filtrados por búsqueda, rol y ordenamiento
  protected filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const cargoId = this.selectedCargoId();
    const { columna, direccion } = this.ordenamiento();
    let filtered = this.users();

    // 1. Filtrar por cargo si está seleccionado
    if (cargoId !== null) {
      filtered = filtered.filter((user) => user.cargo.id === cargoId);
    }

    // 2. Filtrar por búsqueda
    if (query) {
      filtered = filtered.filter(
        (user) =>
          user.nombre.toLowerCase().includes(query) || user.correo.toLowerCase().includes(query)
      );
    }

    // 3. Ordenamiento
    if (columna && direccion) {
      filtered = [...filtered].sort((a, b) => {
        let valorA: string | number;
        let valorB: string | number;

        switch (columna) {
          case 'nombre':
            valorA = a.nombre;
            valorB = b.nombre;
            break;
          case 'correo':
            valorA = a.correo;
            valorB = b.correo;
            break;
          case 'cargo':
            valorA = a.cargo.nombre;
            valorB = b.cargo.nombre;
            break;
          default:
            return 0;
        }

        if (typeof valorA === 'string' && typeof valorB === 'string') {
          return direccion === 'asc' ? valorA.localeCompare(valorB) : valorB.localeCompare(valorA);
        }

        return 0;
      });
    }

    return filtered;
  });

  // Computed: verificar si hay filtros activos
  protected hayFiltrosActivos = computed(() => {
    return (
      this.searchQuery().trim() !== '' ||
      this.selectedCargoId() !== null ||
      this.ordenamiento().columna !== null
    );
  });

  constructor() {
    this.loadUsers();
  }

  /**
   * Obtiene los colores del cargo según su nivel
   */
  protected getCargoColors = getCargoColors;

  /**
   * Cargar usuarios desde el backend
   * TODO: Implementar llamada HTTP real
   */
  protected loadUsers(): void {
    this.loading.set(true);

    // Mock data - remover cuando tengas el endpoint
    setTimeout(() => {
      this.users.set([
        {
          id: 1,
          nombre: 'Juan Pérez',
          correo: 'juan.perez@normet.com',
          cargo: { id: 4, nombre: 'Inspector', nivel: 3 },
        },
        {
          id: 2,
          nombre: 'María García',
          correo: 'maria.garcia@normet.com',
          cargo: { id: 3, nombre: 'Supervisor', nivel: 2 },
        },
        {
          id: 3,
          nombre: 'Carlos López',
          correo: 'carlos.lopez@normet.com',
          cargo: { id: 2, nombre: 'Técnico Mecánico', nivel: 2 },
        },
        {
          id: 4,
          nombre: 'Ana Martínez',
          correo: 'ana.martinez@normet.com',
          cargo: { id: 2, nombre: 'Técnico Mecánico', nivel: 2 },
        },
        {
          id: 5,
          nombre: 'Roberto Silva',
          correo: 'roberto.silva@normet.com',
          cargo: { id: 1, nombre: 'Operador', nivel: 1 },
        },
      ]);
      this.loading.set(false);
    }, 500);
  }

  /**
   * Handler para búsqueda
   */
  protected onSearch(value: string): void {
    this.searchQuery.set(value);
  }

  /**
   * Handler para cambio de filtro de cargo
   */
  protected onFilterChange(cargoId: number | null): void {
    this.selectedCargoId.set(cargoId);
  }

  /**
   * Ordenar por columna
   */
  protected ordenarPor(columna: ColumnaOrdenable): void {
    this.ordenamiento.update((current) => {
      let nuevaDireccion: DireccionOrdenamiento;

      if (current.columna === columna) {
        // Misma columna: cambiar dirección (asc -> desc -> null)
        if (current.direccion === 'asc') {
          nuevaDireccion = 'desc';
        } else if (current.direccion === 'desc') {
          nuevaDireccion = null;
        } else {
          nuevaDireccion = 'asc';
        }
      } else {
        // Nueva columna: empezar con asc
        nuevaDireccion = 'asc';
      }

      return {
        columna: nuevaDireccion ? columna : null,
        direccion: nuevaDireccion,
      };
    });
  }

  /**
   * Obtener dirección de ordenamiento para una columna
   */
  protected getDireccionOrdenamiento(columna: ColumnaOrdenable): DireccionOrdenamiento {
    const { columna: columnaActual, direccion } = this.ordenamiento();
    return columnaActual === columna ? direccion : null;
  }

  /**
   * Limpiar todos los filtros, búsqueda y ordenamiento
   */
  protected limpiarFiltros(): void {
    this.searchQuery.set('');
    this.selectedCargoId.set(null);
    this.ordenamiento.set({
      columna: null,
      direccion: null,
    });
  }

  /**
   * Abrir diálogo para crear usuario
   */
  protected openCreateDialog(): void {
    this.dialogMode.set('create');
    this.selectedUser.set(undefined);
    this.showDialog.set(true);
  }

  /**
   * Abrir diálogo para editar usuario
   */
  protected openEditDialog(user: User): void {
    this.dialogMode.set('edit');
    this.selectedUser.set(user);
    this.showDialog.set(true);
  }

  /**
   * Cerrar diálogo
   */
  protected closeDialog(): void {
    this.showDialog.set(false);
    this.selectedUser.set(undefined);
  }

  /**
   * Handler para guardar (crear/editar)
   */
  protected handleSave(data: CreateUsuarioRequest | UpdateUsuarioRequest): void {
    if (this.dialogMode() === 'create') {
      this.createUser(data as CreateUsuarioRequest);
    } else {
      this.updateUser(this.selectedUser()!.id, data as UpdateUsuarioRequest);
    }
  }

  /**
   * Crear nuevo usuario
   * TODO: Implementar llamada HTTP real
   */
  private createUser(data: CreateUsuarioRequest): void {
    console.log('Crear usuario:', data);
    // Aquí iría la llamada HTTP
    // this.http.post('/users', data).subscribe(...)

    this.closeDialog();
    this.loadUsers();
  }

  /**
   * Actualizar usuario existente
   * TODO: Implementar llamada HTTP real
   */
  private updateUser(id: number, data: UpdateUsuarioRequest): void {
    console.log('Actualizar usuario:', id, data);
    // Aquí iría la llamada HTTP
    // this.http.put(`/users/${id}`, data).subscribe(...)

    this.closeDialog();
    this.loadUsers();
  }

  /**
   * Restablecer contraseña de usuario
   * TODO: Implementar llamada HTTP real
   */
  protected resetPassword(user: User): void {
    this.userToReset.set(user);
    this.showResetConfirm.set(true);
  }

  /**
   * Confirmar restablecimiento de contraseña
   */
  protected confirmResetPassword(): void {
    const user = this.userToReset();
    if (!user) return;

    console.log('Restablecer contraseña:', user.id);
    // Aquí iría la llamada HTTP
    // this.http.post(`/users/${user.id}/reset-password`).subscribe(...)

    this.showResetConfirm.set(false);
    this.userToReset.set(undefined);

    // TODO: Mostrar toast de éxito en lugar de alert
    alert(`La contraseña de ${user.nombre} ha sido restablecida a: Password123?`);
  }

  /**
   * Cancelar restablecimiento de contraseña
   */
  protected cancelResetPassword(): void {
    this.showResetConfirm.set(false);
    this.userToReset.set(undefined);
  }

  /**
   * Eliminar usuario
   * TODO: Implementar llamada HTTP real
   */
  protected deleteUser(user: User): void {
    this.userToDelete.set(user);
    this.showDeleteConfirm.set(true);
  }

  /**
   * Confirmar eliminación de usuario
   */
  protected confirmDeleteUser(): void {
    const user = this.userToDelete();
    if (!user) return;

    console.log('Eliminar usuario:', user.id);
    // Aquí iría la llamada HTTP
    // this.http.delete(`/users/${user.id}`).subscribe(...)

    this.showDeleteConfirm.set(false);
    this.userToDelete.set(undefined);
    this.loadUsers();
  }

  /**
   * Cancelar eliminación de usuario
   */
  protected cancelDeleteUser(): void {
    this.showDeleteConfirm.set(false);
    this.userToDelete.set(undefined);
  }
}
