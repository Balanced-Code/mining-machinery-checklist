import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  Cargo,
  CreateUsuarioRequest,
  UpdateUsuarioRequest,
  User,
  UserDialogMode,
} from '@core/models/user.model';
import { AuthService } from '@core/services/auth.service';
import { UsuariosService } from '@core/services/usuarios.service';
import { ConfirmDialog } from '@shared/components/confirm-dialog/confirm-dialog';
import { ToastService } from '@shared/services/toast.service';
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
  // Servicios inyectados
  private readonly usuariosService = inject(UsuariosService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  // Signals para estado local (filtros y UI)
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
  protected showReactivateConfirm = signal(false);
  protected userToReset = signal<User | undefined>(undefined);
  protected userToDelete = signal<User | undefined>(undefined);
  protected userToReactivate = signal<User | undefined>(undefined);

  // Computed: usuarios del servicio (reactivo)
  protected users = this.usuariosService.usuarios;
  protected loading = this.usuariosService.loading;

  // Computed: cargos desde AuthService
  // Signal para cargos cargados desde backend
  protected cargosSignal = signal<Cargo[]>([]);

  // Computed: cargos (ahora simplemente devuelve el valor del signal)
  protected cargos = computed(() => this.cargosSignal());

  // Computed: Nivel del usuario actual
  protected currentUserLevel = computed(() => {
    return this.authService.user()?.cargo.nivel;
  });

  // Computed: ID del usuario actual
  protected currentUserId = computed(() => {
    return this.authService.user()?.id;
  });

  /**
   * Verifica si el usuario actual puede editar/eliminar a otro usuario
   * No puede editar:
   * - A sí mismo
   * - A usuarios con su mismo nivel o superior (mayor jerarquía)
   */
  protected canEditUser(user: User): boolean {
    const currentLevel = this.currentUserLevel();
    const currentId = this.currentUserId();

    // Si es el mismo usuario, no puede editarlo
    if (user.id === currentId) {
      return false;
    }

    // Si no hay nivel actual, denegar por seguridad
    if (currentLevel === undefined) {
      return false;
    }

    // No puede editar usuarios con nivel >= al suyo
    // (Recordar: nivel mayor = más jerarquía)
    return user.cargo.nivel < currentLevel;
  }

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
    // Cargar usuarios al inicializar el componente
    this.loadUsers();
  }

  /**
   * Obtiene los colores del cargo según su nivel
   */
  protected getCargoColors = getCargoColors;

  /**
   * Cargar usuarios desde el backend
   */
  protected async loadUsers(): Promise<void> {
    try {
      const [_, cargos] = await Promise.all([
        this.usuariosService.getAll(),
        this.usuariosService.getCargos(),
      ]);

      this.cargosSignal.set(cargos);
    } catch (error) {
      this.toastService.error('Error al cargar los datos');
      console.error('Error al cargar datos:', error);
    }
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
   */
  private async createUser(data: CreateUsuarioRequest): Promise<void> {
    try {
      const result = await this.usuariosService.create(data);

      if (result) {
        this.toastService.success(`Usuario creado exitosamente. Contraseña: ${result.password}`);
        this.closeDialog();
      } else {
        this.toastService.error('Error al crear el usuario');
      }
    } catch (error) {
      console.error('Error al crear usuario:', error);
      // El error ya fue manejado por el servicio y mostrado en toast
    }
  }

  /**
   * Actualizar usuario existente
   */
  private async updateUser(id: number, data: UpdateUsuarioRequest): Promise<void> {
    try {
      const success = await this.usuariosService.update(id, data);

      if (success) {
        this.toastService.success('Usuario actualizado exitosamente');
        this.closeDialog();
      } else {
        this.toastService.error('Error al actualizar el usuario');
      }
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      // El error ya fue manejado por el servicio
    }
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
  protected async confirmResetPassword(): Promise<void> {
    const user = this.userToReset();
    if (!user) return;

    try {
      const newPassword = await this.usuariosService.resetPassword(user.id);

      if (newPassword) {
        this.toastService.success(`Contraseña de ${user.nombre} restablecida a: ${newPassword}`);
      } else {
        this.toastService.error('Error al restablecer la contraseña');
      }
    } catch (error) {
      console.error('Error al restablecer contraseña:', error);
      // El error ya fue manejado por el servicio
    } finally {
      this.showResetConfirm.set(false);
      this.userToReset.set(undefined);
    }
  }

  /**
   * Cancelar restablecimiento de contraseña
   */
  protected cancelResetPassword(): void {
    this.showResetConfirm.set(false);
    this.userToReset.set(undefined);
  }

  /**
   * Handler para reset password desde el diálogo
   */
  protected async handleDialogResetPassword(): Promise<void> {
    const user = this.selectedUser();
    if (!user) return;

    try {
      const newPassword = await this.usuariosService.resetPassword(user.id);

      if (newPassword) {
        this.toastService.success(`Contraseña restablecida a: ${newPassword}`);
      } else {
        this.toastService.error('Error al restablecer la contraseña');
      }
    } catch (error) {
      console.error('Error al restablecer contraseña:', error);
    }
  }

  /**
   * Handler para cambiar estado desde el diálogo
   */
  protected async handleDialogToggleStatus(): Promise<void> {
    const user = this.selectedUser();
    if (!user) return;

    const isActive = user.eliminadoEn === null;

    try {
      let success: boolean;

      if (isActive) {
        // Desactivar usuario
        success = await this.usuariosService.delete(user.id);
        if (success) {
          this.toastService.success(`Usuario ${user.nombre} desactivado exitosamente`);
          this.closeDialog();
        } else {
          this.toastService.error('Error al desactivar el usuario');
        }
      } else {
        // Activar usuario
        success = await this.usuariosService.reactivate(user.id);
        if (success) {
          this.toastService.success(`Usuario ${user.nombre} activado exitosamente`);
          this.closeDialog();
        } else {
          this.toastService.error('Error al activar el usuario');
        }
      }
    } catch (error) {
      console.error('Error al cambiar estado del usuario:', error);
    }
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
  protected async confirmDeleteUser(): Promise<void> {
    const user = this.userToDelete();
    if (!user) return;

    try {
      const success = await this.usuariosService.delete(user.id);

      if (success) {
        this.toastService.success(`Usuario ${user.nombre} eliminado exitosamente`);
      } else {
        this.toastService.error('Error al eliminar el usuario');
      }
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      // El error ya fue manejado por el servicio
    } finally {
      this.showDeleteConfirm.set(false);
      this.userToDelete.set(undefined);
    }
  }

  /**
   * Cancelar eliminación de usuario
   */
  protected cancelDeleteUser(): void {
    this.showDeleteConfirm.set(false);
    this.userToDelete.set(undefined);
  }

  /**
   * Reactivar usuario
   */
  protected reactivateUser(user: User): void {
    this.userToReactivate.set(user);
    this.showReactivateConfirm.set(true);
  }

  /**
   * Confirmar reactivación de usuario
   */
  protected async confirmReactivateUser(): Promise<void> {
    const user = this.userToReactivate();
    if (!user) return;

    try {
      const success = await this.usuariosService.reactivate(user.id);

      if (success) {
        this.toastService.success(`Usuario ${user.nombre} reactivado exitosamente`);
      } else {
        this.toastService.error('Error al reactivar el usuario');
      }
    } catch (error) {
      console.error('Error al reactivar usuario:', error);
    } finally {
      this.showReactivateConfirm.set(false);
      this.userToReactivate.set(undefined);
    }
  }

  /**
   * Cancelar reactivación de usuario
   */
  protected cancelReactivateUser(): void {
    this.showReactivateConfirm.set(false);
    this.userToReactivate.set(undefined);
  }
}
