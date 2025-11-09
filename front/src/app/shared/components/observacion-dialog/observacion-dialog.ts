import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Observacion } from '@core/models/inspeccion.model';

export type ModoObservacion = 'crear' | 'editar' | 'ver';

export interface ObservacionDialogData {
  itemDescripcion: string;
  observacionInicial?: Observacion;
  modo: ModoObservacion;
  requiereObservacion: boolean;
}

@Component({
  selector: 'app-observacion-dialog',
  imports: [FormsModule, MatIconModule],
  templateUrl: './observacion-dialog.html',
  styleUrl: './observacion-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'observacion-dialog-host',
  },
})
export class ObservacionDialog {
  // Injected data
  private readonly dialogRef = inject(MatDialogRef<ObservacionDialog>);
  protected readonly data: ObservacionDialogData = inject(MAT_DIALOG_DATA);

  // Inputs from data
  itemDescripcion = signal(this.data.itemDescripcion);
  modo = signal(this.data.modo);
  requiereObservacion = signal(this.data.requiereObservacion);

  // Estado local
  protected readonly descripcion = signal(this.data.observacionInicial?.descripcion || '');
  protected readonly archivosNuevos = signal<File[]>([]);
  protected readonly archivosExistentes = signal(this.data.observacionInicial?.archivos || []);
  protected readonly imagenesPreview = signal<string[]>([]);

  // Computed
  protected readonly esEditable = computed(() => this.modo() !== 'ver');
  protected readonly tieneCambios = computed(() => {
    const obs = this.data.observacionInicial;
    return (
      this.descripcion() !== (obs?.descripcion || '') ||
      this.archivosNuevos().length > 0 ||
      this.archivosExistentes().length !== (obs?.archivos?.length || 0)
    );
  });

  protected readonly descripcionValida = computed(() => {
    if (!this.requiereObservacion()) return true;
    return this.descripcion().trim().length > 0;
  });

  protected readonly puedeGuardar = computed(() => {
    return this.esEditable() && this.descripcionValida() && this.tieneCambios();
  });

  /**
   * Maneja la selección de archivos
   */
  protected onFileSelect(event: Event): void {
    if (!this.esEditable()) return;

    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const newFiles = Array.from(input.files);
    const imageFiles = newFiles.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length !== newFiles.length) {
      console.warn('Solo se permiten archivos de imagen');
    }

    this.archivosNuevos.update((archivos) => [...archivos, ...imageFiles]);

    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagenesPreview.update((previews) => [...previews, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    input.value = '';
  }

  /**
   * Elimina un archivo nuevo
   */
  protected eliminarArchivoNuevo(index: number): void {
    if (!this.esEditable()) return;

    this.archivosNuevos.update((archivos) => archivos.filter((_, i) => i !== index));
    this.imagenesPreview.update((previews) => previews.filter((_, i) => i !== index));
  }

  /**
   * Elimina un archivo existente
   */
  protected eliminarArchivoExistente(index: number): void {
    if (!this.esEditable()) return;

    this.archivosExistentes.update((archivos) => archivos.filter((_, i) => i !== index));
  }

  /**
   * Guarda la observación
   */
  protected guardar(): void {
    if (!this.puedeGuardar()) return;

    this.dialogRef.close({
      descripcion: this.descripcion().trim(),
      archivosNuevos: this.archivosNuevos(),
      archivosExistentes: this.archivosExistentes(),
    });
  }

  /**
   * Cancela la edición
   */
  protected cancelar(): void {
    this.dialogRef.close();
  }

  /**
   * Actualiza la descripción
   */
  protected updateDescripcion(value: string): void {
    this.descripcion.set(value);
  }

  /**
   * Obtiene el título del diálogo según el modo
   */
  protected getTitulo(): string {
    switch (this.modo()) {
      case 'crear':
        return 'Agregar Observación';
      case 'editar':
        return 'Editar Observación';
      case 'ver':
        return 'Ver Observación';
      default:
        return 'Observación';
    }
  }
}
