import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Cargo,
  CreateUsuarioRequest,
  UpdateUsuarioRequest,
  User,
  UserDialogMode,
} from '@core/models/user.model';
import { ConfirmDialog } from '@shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-user-dialog',
  imports: [FormsModule, ConfirmDialog],
  templateUrl: './user-dialog.html',
  styleUrl: './user-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'user-dialog-host',
  },
})
export class UserDialog implements OnInit {
  // Inputs
  mode = input.required<UserDialogMode>();
  user = input<User | undefined>();
  cargos = input.required<Cargo[]>();

  // Outputs
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<CreateUsuarioRequest | UpdateUsuarioRequest>();
  @Output() onResetPassword = new EventEmitter<void>();
  @Output() onToggleStatus = new EventEmitter<void>();

  // State
  protected saving = signal(false);
  protected readonly generatedPassword = 'Password123?';
  protected showResetConfirm = signal(false);
  protected showStatusConfirm = signal(false);
  protected passwordCopied = signal(false);

  // Form data
  protected formData = {
    nombre: '',
    correo: '',
    cargoId: null as number | null,
  };

  ngOnInit(): void {
    // Si es edición, cargar datos del usuario
    if (this.mode() === 'edit' && this.user()) {
      const userData = this.user()!;
      this.formData = {
        nombre: userData.nombre,
        correo: userData.correo,
        cargoId: userData.cargo.id,
      };
    }
  }

  /**
   * Cerrar diálogo
   */
  protected close(): void {
    this.onClose.emit();
  }

  /**
   * Guardar cambios
   */
  protected save(): void {
    if (this.saving()) return;

    this.saving.set(true);

    let data: CreateUsuarioRequest | UpdateUsuarioRequest;

    if (this.mode() === 'create') {
      data = {
        nombre: this.formData.nombre,
        correo: this.formData.correo,
        cargoId: this.formData.cargoId!,
      };
    } else {
      // En modo edición, enviamos nombre y cargoId siempre.
      // El backend se encarga de verificar si hubo cambios reales.
      // No enviamos correo porque no es editable.
      data = {
        nombre: this.formData.nombre,
        cargoId: Number(this.formData.cargoId!),
      };
    }

    this.onSave.emit(data);
    this.saving.set(false);
  }

  /**
   * Handler para restablecer contraseña
   */
  protected resetPasswordClick(): void {
    this.showResetConfirm.set(true);
  }

  /**
   * Confirmar restablecimiento de contraseña
   */
  protected confirmResetPassword(): void {
    this.showResetConfirm.set(false);
    this.onResetPassword.emit();
  }

  /**
   * Cancelar restablecimiento de contraseña
   */
  protected cancelResetPassword(): void {
    this.showResetConfirm.set(false);
  }

  /**
   * Copiar contraseña al portapapeles
   */
  protected copyPassword(): void {
    navigator.clipboard.writeText(this.generatedPassword).then(() => {
      this.passwordCopied.set(true);
      setTimeout(() => {
        this.passwordCopied.set(false);
      }, 2000);
    });
  }

  /**
   * Verificar si el usuario está activo
   */
  protected isUserActive(): boolean {
    return this.user()?.eliminadoEn === null;
  }

  /**
   * Handler para cambiar estado del usuario
   */
  protected toggleStatusClick(): void {
    this.showStatusConfirm.set(true);
  }

  /**
   * Confirmar cambio de estado
   */
  protected confirmToggleStatus(): void {
    this.showStatusConfirm.set(false);
    this.onToggleStatus.emit();
  }

  /**
   * Cancelar cambio de estado
   */
  protected cancelToggleStatus(): void {
    this.showStatusConfirm.set(false);
  }

  /**
   * Obtener mensaje de error para el campo nombre
   */
  protected getNombreError(): string {
    const errors = this.formData.nombre ? null : {};
    if (!errors) return '';

    // Simular errores de validación basados en el valor
    const nombre = this.formData.nombre || '';

    if (!nombre) return 'El nombre es obligatorio.';
    if (nombre.length < 3) return 'El nombre debe tener al menos 3 caracteres.';
    if (nombre.length > 80) return 'El nombre no puede exceder 80 caracteres.';
    if (!/^[A-Za-zÀ-ÿ\u00f1\u00d1\s]+$/.test(nombre)) {
      return 'El nombre solo puede contener letras, espacios y acentos.';
    }

    return '';
  }

  /**
   * Obtener mensaje de error para el campo correo
   */
  protected getCorreoError(): string {
    const correo = this.formData.correo || '';

    if (!correo) return 'El correo es obligatorio.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return 'Ingresa un correo electrónico válido.';
    }
    if (!/^[a-zA-Z0-9._%+-]+@normet\.com$/.test(correo)) {
      return 'El correo debe ser del dominio @normet.com';
    }

    return '';
  }
}
