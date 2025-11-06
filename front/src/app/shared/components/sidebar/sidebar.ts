import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SidebarService } from '../../services/sidebar';

interface MenuItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  protected readonly sidebarService = inject(SidebarService);

  // Menú de navegación
  protected readonly menuItems: MenuItem[] = [
    { icon: 'home', label: 'Home', route: '/dashboard' },
    { icon: 'users', label: 'Usuarios', route: '/usuarios' },
    { icon: 'checklist', label: 'Checklist', route: '/checklist' },
    { icon: 'history', label: 'Historial', route: '/historial' },
    { icon: 'clipboard', label: 'Crear revisión', route: '/revision' },
  ];

  /**
   * Alterna el estado del sidebar (abrir/cerrar)
   */
  protected toggleSidebar(): void {
    this.sidebarService.toggle();
  }

  /**
   * Cierra el sidebar (para mobile cuando se navega)
   */
  protected onNavigate(): void {
    if (this.sidebarService.isMobile()) {
      this.sidebarService.close();
    }
  }

  /**
   * Cierra el sidebar al hacer clic en el backdrop
   */
  protected closeOnBackdrop(): void {
    if (this.sidebarService.isMobile()) {
      this.sidebarService.close();
    }
  }
}
