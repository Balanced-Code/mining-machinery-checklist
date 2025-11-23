import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { Header } from '@shared/components/header/header';
import { Sidebar } from '@shared/components/sidebar/sidebar';
import { filter } from 'rxjs';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Header, Sidebar],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Signals para título y descripción (se actualizan desde la ruta activa)
  protected readonly pageTitle = signal<string>('');
  protected readonly pageDescription = signal<string>('');

  // Exponer datos reactivos del usuario
  protected readonly user = this.authService.user;
  protected readonly currentCargo = this.authService.currentCargo;

  constructor() {
    // Actualizar título y descripción cuando cambia la ruta
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.updatePageInfo();
    });

    // Cargar info inicial
    this.updatePageInfo();
  }

  /**
   * Actualiza el título y descripción desde la ruta activa
   */
  private updatePageInfo(): void {
    let child = this.route.firstChild;
    while (child) {
      if (child.snapshot?.data) {
        if (child.snapshot.data['title']) {
          this.pageTitle.set(child.snapshot.data['title']);
        }
        if (child.snapshot.data['description']) {
          this.pageDescription.set(child.snapshot.data['description']);
        }
      }
      child = child.firstChild;
    }
  }

  /**
   * Cierra la sesión del usuario
   */
  protected async handleLogout(): Promise<void> {
    await this.authService.logout();
  }
}
