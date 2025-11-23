import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '@core/services/auth.service';
import { getCargoColors } from '@shared/utils/cargo-colors.util';

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

  // Errores específicos de cada campo (desde backend)
  protected readonly currentPasswordError = signal<string | null>(null);
  protected readonly newPasswordError = signal<string | null>(null);
  protected readonly confirmPasswordError = signal<string | null>(null);

  // Formulario de cambio de contraseña
  protected readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required, Validators.minLength(8)]],
      newPassword: [
        '',
        [Validators.required, Validators.minLength(8), this.passwordStrengthValidator],
      ],
      confirmPassword: ['', [Validators.required]], // Solo required, la coincidencia se valida con passwordMatchValidator
    },
    {
      validators: [this.passwordMatchValidator, this.passwordDifferentValidator],
    }
  );

  constructor() {
    // Escuchar cambios en cualquier campo del formulario para limpiar errores
    this.passwordForm.valueChanges.subscribe(() => {
      this.currentPasswordError.set(null);
      this.newPasswordError.set(null);
      this.confirmPasswordError.set(null);
      this.successMessage.set(null);
    });
  }

  /**
   * Validador personalizado para verificar que las contraseñas coincidan
   * Solo valida cuando confirmPassword ha sido tocado y tiene valor
   */
  private passwordMatchValidator(control: import('@angular/forms').AbstractControl) {
    const group = control as ReturnType<typeof this.fb.nonNullable.group>;
    const newPasswordControl = group.get('newPassword');
    const confirmPasswordControl = group.get('confirmPassword');

    const newPassword = newPasswordControl?.value;
    const confirmPassword = confirmPasswordControl?.value;

    // No validar si confirmPassword no ha sido tocado o está vacío
    if (!confirmPasswordControl?.touched || !confirmPassword) {
      return null;
    }

    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  /**
   * Validador personalizado para verificar que la nueva contraseña sea diferente de la actual
   * Solo valida cuando newPassword ha sido tocado y tiene valor
   */
  private passwordDifferentValidator(control: import('@angular/forms').AbstractControl) {
    const group = control as ReturnType<typeof this.fb.nonNullable.group>;
    const currentPasswordControl = group.get('currentPassword');
    const newPasswordControl = group.get('newPassword');

    const currentPassword = currentPasswordControl?.value;
    const newPassword = newPasswordControl?.value;

    // No validar si newPassword no ha sido tocado o está vacío
    if (!newPasswordControl?.touched || !newPassword || !currentPassword) {
      return null;
    }

    // La nueva contraseña debe ser diferente de la actual
    return currentPassword !== newPassword ? null : { passwordSame: true };
  }

  /**
   * Validador personalizado para verificar la fortaleza de la contraseña
   * Requiere: mayúsculas, minúsculas, números y símbolos especiales
   */
  private passwordStrengthValidator(
    control: import('@angular/forms').AbstractControl
  ): import('@angular/forms').ValidationErrors | null {
    const password = control.value;

    if (!password) {
      return null; // Si está vacío, lo maneja el validator 'required'
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

    const isValid = hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;

    if (!isValid) {
      return {
        passwordStrength: {
          hasUpperCase,
          hasLowerCase,
          hasNumber,
          hasSpecialChar,
        },
      };
    }

    return null;
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
    // Limpiar errores previos de backend
    this.currentPasswordError.set(null);
    this.newPasswordError.set(null);
    this.confirmPasswordError.set(null);
    this.successMessage.set(null);

    // Si el formulario es inválido, marcar todos los campos como touched
    // para mostrar los errores individuales debajo de cada input
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    try {
      const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();

      // Llamar al endpoint de cambio de contraseña
      await this.authService.changePassword(currentPassword, newPassword, confirmPassword);

      // Si llegamos aquí, el cambio fue exitoso
      // Nota: El servicio automáticamente redirige al login después del cambio
      this.successMessage.set('Contraseña actualizada correctamente. Redirigiendo al login...');
      this.passwordForm.reset();
    } catch (error: unknown) {
      // Mapear errores del backend a los campos específicos
      const message = error instanceof Error ? error.message : 'Error al actualizar la contraseña';

      // Clasificar el error según el mensaje del backend
      if (
        message.includes('contraseña actual es incorrecta') ||
        message.includes('actual es incorrecta')
      ) {
        this.currentPasswordError.set(message);
      } else if (
        message.includes('contraseñas nuevas no coinciden') ||
        message.includes('no coinciden')
      ) {
        this.confirmPasswordError.set(message);
      } else if (
        message.includes('debe ser diferente') ||
        message.includes('diferente a la actual')
      ) {
        this.newPasswordError.set(message);
      } else {
        // Error genérico - mostrar en el campo de contraseña actual por defecto
        this.currentPasswordError.set(message);
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
