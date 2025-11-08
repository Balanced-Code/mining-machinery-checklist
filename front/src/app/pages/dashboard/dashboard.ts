import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface DashboardCard {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  description: string;
  route?: string;
}

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  requiredLevel?: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [MatIconModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Usuario actual
  protected readonly user = this.authService.user;
  protected readonly currentCargo = this.authService.currentCargo;

  // Mock data - En producción vendría del backend
  private readonly mockStats = signal({
    totalInspecciones: 127,
    inspeccionesEnProgreso: 8,
    inspeccionesCompletadas: 119,
    inspeccionesHoy: 3,
    totalMaquinas: 45,
    totalUsuarios: 23,
  });

  // Tarjetas de estadísticas
  protected readonly statsCards = computed<DashboardCard[]>(() => {
    const stats = this.mockStats();
    const nivel = this.user()?.cargo.nivel ?? 1;

    const cards: DashboardCard[] = [
      {
        title: 'Inspecciones Totales',
        value: stats.totalInspecciones,
        icon: 'assignment',
        color: '#3b82f6',
        description: 'Total de inspecciones realizadas',
        route: '/historial',
      },
      {
        title: 'En Progreso',
        value: stats.inspeccionesEnProgreso,
        icon: 'pending',
        color: '#f59e0b',
        description: 'Inspecciones sin finalizar',
        route: '/historial',
      },
      {
        title: 'Completadas',
        value: stats.inspeccionesCompletadas,
        icon: 'check_circle',
        color: '#10b981',
        description: 'Inspecciones finalizadas',
        route: '/historial',
      },
      {
        title: 'Hoy',
        value: stats.inspeccionesHoy,
        icon: 'today',
        color: '#8b5cf6',
        description: 'Inspecciones de hoy',
        route: '/historial',
      },
    ];

    // Mostrar tarjeta de máquinas solo para nivel 2+
    if (nivel >= 2) {
      cards.push({
        title: 'Máquinas',
        value: stats.totalMaquinas,
        icon: 'precision_manufacturing',
        color: '#06b6d4',
        description: 'Total de maquinaria',
      });
    }

    // Mostrar tarjeta de usuarios solo para nivel 3+
    if (nivel >= 3) {
      cards.push({
        title: 'Usuarios',
        value: stats.totalUsuarios,
        icon: 'group',
        color: '#ec4899',
        description: 'Usuarios del sistema',
        route: '/usuarios',
      });
    }

    return cards;
  });

  // Acciones rápidas
  protected readonly quickActions = computed<QuickAction[]>(() => {
    const nivel = this.user()?.cargo.nivel ?? 1;

    const actions: QuickAction[] = [
      {
        title: 'Ver Historial',
        description: 'Consulta el historial completo de inspecciones',
        icon: 'history',
        route: '/historial',
        color: '#3b82f6',
      },
      {
        title: 'Checklists',
        description: 'Gestiona las listas de verificación',
        icon: 'checklist',
        route: '/checklist',
        color: '#10b981',
      },
    ];

    // Crear inspección solo para nivel 2+
    if (nivel >= 2) {
      actions.unshift({
        title: 'Nueva Inspección',
        description: 'Crear una nueva inspección de maquinaria',
        icon: 'add_circle',
        route: '/inspeccion/crear',
        color: '#ed1b2e',
      });
    }

    // Gestión de usuarios solo para nivel 3+
    if (nivel >= 3) {
      actions.push({
        title: 'Gestionar Usuarios',
        description: 'Administra los usuarios del sistema',
        icon: 'manage_accounts',
        route: '/usuarios',
        color: '#8b5cf6',
        requiredLevel: 3,
      });
    }

    return actions;
  });

  // Saludo según hora del día
  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  });

  /**
   * Navegar a una ruta
   */
  protected navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
