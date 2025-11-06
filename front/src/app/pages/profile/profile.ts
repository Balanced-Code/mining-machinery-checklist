import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { getCargoColors } from '../../shared/utils/cargo-colors.util';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  // Datos del usuario desde el servicio de autenticación
  protected readonly user = this.authService.user;
  protected readonly currentCargo = this.authService.currentCargo;

  // Colores dinámicos del badge según nivel del cargo
  protected readonly badgeColors = computed(() => {
    const nivel = this.user()?.cargo.nivel ?? 1;
    return getCargoColors(nivel);
  });

  // Estados del componente
  protected readonly isLoading = signal(false);
  protected readonly showCurrentPassword = signal(false);
  protected readonly showNewPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  // Formulario de cambio de contraseña
  protected readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: this.passwordMatchValidator,
    }
  );

  /**
   * Validador personalizado para verificar que las contraseñas coincidan
   */
  private passwordMatchValidator(control: import('@angular/forms').AbstractControl) {
    const group = control as ReturnType<typeof this.fb.nonNullable.group>;
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  /**
   * Alterna la visibilidad de la contraseña actual
   */
  protected toggleCurrentPassword(): void {
    this.showCurrentPassword.update((value) => !value);
  }

  /**
   * Alterna la visibilidad de la nueva contraseña
   */
  protected toggleNewPassword(): void {
    this.showNewPassword.update((value) => !value);
  }

  /**
   * Alterna la visibilidad de la confirmación de contraseña
   */
  protected toggleConfirmPassword(): void {
    this.showConfirmPassword.update((value) => !value);
  }

  /**
   * Maneja el envío del formulario de cambio de contraseña
   */
  protected async onSubmit(): Promise<void> {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    try {
      const { currentPassword: _currentPassword, newPassword: _newPassword } =
        this.passwordForm.getRawValue();

      // TODO: Llamar al endpoint de cambio de contraseña
      // await this.authService.changePassword(currentPassword, newPassword);

      // Simulación temporal
      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.successMessage.set('Contraseña actualizada correctamente');
      this.passwordForm.reset();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al actualizar la contraseña';
      this.errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }
}
