import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { SidebarService } from '@shared/services/sidebar';

interface MenuItem {
  icon: string;
  label: string;
  route: string;
  minLevel?: number; // Nivel mínimo requerido para ver esta opción
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  private readonly authService = inject(AuthService);
  protected readonly sidebarService = inject(SidebarService);

  // Menú de navegación
  private readonly allMenuItems: MenuItem[] = [
    { icon: 'dashboard', label: 'Dashboard', route: '/dashboard' },
    { icon: 'people', label: 'Usuarios', route: '/usuarios', minLevel: 3 },
    { icon: 'checklist', label: 'Checklist', route: '/checklist', minLevel: 3 },
    { icon: 'precision_manufacturing', label: 'Maquinaria', route: '/maquinaria', minLevel: 3 },
    { icon: 'history', label: 'Historial', route: '/historial' },
    { icon: 'assignment', label: 'Crear revisión', route: '/inspeccion/crear', minLevel: 3 },
  ];

  // Filtrar items del menú según el nivel del cargo del usuario
  protected readonly menuItems = computed(() => {
    const userLevel = this.authService.user()?.cargo.nivel ?? 0;
    return this.allMenuItems.filter((item) => !item.minLevel || userLevel >= item.minLevel);
  });

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
