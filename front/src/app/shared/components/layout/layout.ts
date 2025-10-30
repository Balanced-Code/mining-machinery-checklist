import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Exponer datos reactivos del usuario
  protected readonly user = this.authService.user;
  protected readonly currentCargo = this.authService.currentCargo;

  /**
   * Cierra la sesión del usuario
   */
  protected async handleLogout(): Promise<void> {
    await this.authService.logout();
  }
}
