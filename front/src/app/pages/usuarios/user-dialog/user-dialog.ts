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
import { Cargo } from '../../../core/models/user.model';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import {
  CreateUsuarioRequest,
  UpdateUsuarioRequest,
  UserDialogMode,
  Usuario,
} from '../usuarios.models';

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
  user = input<Usuario | undefined>();
  cargos = input.required<Cargo[]>();

  // Outputs
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<CreateUsuarioRequest | UpdateUsuarioRequest>();

  // State
  protected saving = signal(false);
  protected readonly generatedPassword = 'Password123?';
  protected showResetConfirm = signal(false);
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

    const data: CreateUsuarioRequest | UpdateUsuarioRequest = {
      nombre: this.formData.nombre,
      correo: this.formData.correo,
      cargoId: this.formData.cargoId!,
    };

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
    console.log('Restablecer contraseña desde diálogo');
    // Aquí se llamaría al servicio para restablecer contraseña
    // TODO: Mostrar toast de éxito en lugar de alert
    alert('La contraseña ha sido restablecida a: Password123?');
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
}
