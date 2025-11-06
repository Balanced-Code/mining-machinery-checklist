import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarService } from '../../services/sidebar';
import { getAvatarBackground, getCargoColors } from '../../utils/cargo-colors.util';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.css',
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class Header {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly sidebarService = inject(SidebarService);

  // Inputs para el título y descripción de la página actual (vienen del Layout)
  title = input.required<string>();
  description = input.required<string>();

  // Estado del menú contextual
  protected isMenuOpen = signal(false);

  // Exponer datos del usuario
  protected readonly user = this.authService.user;
  protected readonly currentCargo = this.authService.currentCargo;

  // Colores dinámicos basados en el nivel del cargo
  protected readonly avatarBgColor = computed(() => {
    const nivel = this.user()?.cargo.nivel ?? 1;
    return getAvatarBackground(nivel);
  });

  protected readonly badgeColors = computed(() => {
    const nivel = this.user()?.cargo.nivel ?? 1;
    return getCargoColors(nivel);
  });

  // Generar las iniciales del usuario (primeras dos letras del nombre)
  protected get userInitials(): string {
    const name = this.user()?.nombre || '';
    return name.substring(0, 2).toUpperCase();
  }

  // Obtener el nombre del usuario
  protected get fullName(): string {
    return this.user()?.nombre || '';
  }

  /**
   * Alterna el sidebar (para mobile)
   */
  protected toggleSidebar(): void {
    this.sidebarService.toggle();
  }

  /**
   * Navega al dashboard (página de inicio)
   * Si ya estás en dashboard, recarga la página
   */
  protected goToDashboard(): void {
    if (this.router.url === '/dashboard') {
      // Si ya estamos en dashboard, recargar la página
      window.location.reload();
    } else {
      // Si no, navegar al dashboard
      this.router.navigate(['/dashboard']);
    }
  }

  /**
   * Alterna el menú contextual
   */
  protected toggleMenu(event: Event): void {
    event.stopPropagation();
    this.isMenuOpen.update((value) => !value);
  }

  /**
   * Cierra el menú cuando se hace clic fuera
   */
  protected onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-wrapper')) {
      this.isMenuOpen.set(false);
    }
  }

  /**
   * Navega al perfil del usuario
   */
  protected goToProfile(): void {
    this.isMenuOpen.set(false);
    this.router.navigate(['/perfil']);
  }

  /**
   * Cierra la sesión del usuario
   */
  protected async handleLogout(): Promise<void> {
    this.isMenuOpen.set(false);
    await this.authService.logout();
  }
}
