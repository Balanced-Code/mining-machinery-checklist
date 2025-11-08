import { effect, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  // Estado del sidebar (abierto/cerrado)
  isOpen = signal(true);

  // Estado del modo mobile
  isMobile = signal(false);

  // Estado del modo tablet
  isTablet = signal(false);

  constructor() {
    // Detectar el tamaño de pantalla al iniciar
    this.checkScreenSize();

    // Listener para cambios de tamaño de pantalla
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.checkScreenSize());
    }

    // En mobile/tablet, el sidebar empieza cerrado
    effect(() => {
      if (this.isMobile() || this.isTablet()) {
        this.isOpen.set(false);
      }
    });
  }

  /**
   * Detecta el tamaño de pantalla y actualiza los estados
   */
  private checkScreenSize(): void {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    this.isMobile.set(width < 768);
    this.isTablet.set(width >= 768 && width < 1024);
  }

  /**
   * Alterna el estado del sidebar
   */
  toggle(): void {
    this.isOpen.update((value) => !value);
  }

  /**
   * Cierra el sidebar
   */
  close(): void {
    this.isOpen.set(false);
  }

  /**
   * Abre el sidebar
   */
  open(): void {
    this.isOpen.set(true);
  }
}
