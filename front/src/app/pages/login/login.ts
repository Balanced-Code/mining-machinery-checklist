import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);

  loginForm: FormGroup;

  constructor() {
    this.loginForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email, this.normetEmailValidator]],
      contrasena: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  /**
   * Validador personalizado para correos @normet.com
   */
  private normetEmailValidator(control: AbstractControl): ValidationErrors | null {
    const email = control.value;

    if (!email) {
      return null; // Si está vacío, lo maneja el validator 'required'
    }

    const isNormetEmail = /^[a-zA-Z0-9._%+-]+@normet\.com$/.test(email);

    if (!isNormetEmail) {
      return { normetDomain: true };
    }

    return null;
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    await this.authService.login(this.loginForm.value);
  }

  get correo() {
    return this.loginForm.get('correo');
  }

  get contrasena() {
    return this.loginForm.get('contrasena');
  }
}
