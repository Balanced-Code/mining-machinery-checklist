import { Component, inject, input } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Header, Sidebar],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Inputs para personalizar el header
  pageTitle = input<string>('Dashboard');
  pageDescription = input<string>('Panel principal');

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
