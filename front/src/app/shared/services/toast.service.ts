import { inject, Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);

  private readonly defaultConfig: MatSnackBarConfig = {
    duration: 3000,
    horizontalPosition: 'end',
    verticalPosition: 'bottom',
  };

  /**
   * Muestra una notificación de éxito
   */
  success(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      ...this.defaultConfig,
      panelClass: ['toast-success'],
    });
  }

  /**
   * Muestra una notificación de error
   */
  error(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      ...this.defaultConfig,
      duration: 5000, // Errores se muestran más tiempo
      panelClass: ['toast-error'],
    });
  }

  /**
   * Muestra una notificación informativa
   */
  info(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      ...this.defaultConfig,
      panelClass: ['toast-info'],
    });
  }

  /**
   * Muestra una notificación de advertencia
   */
  warning(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      ...this.defaultConfig,
      duration: 4000,
      panelClass: ['toast-warning'],
    });
  }
}
