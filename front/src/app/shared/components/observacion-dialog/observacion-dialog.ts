import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Archivo, Observacion } from '@core/models/inspeccion.model';
import { ArchivoService } from '@core/services/archivo.service';

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
  // Services
  protected readonly archivoService = inject(ArchivoService);

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
  protected readonly archivosExistentes = signal<Archivo[]>(
    this.data.observacionInicial?.archivos || []
  );
  protected readonly archivosEliminadosIds = signal<string[]>([]);
  protected readonly imagenesPreview = signal<{ file: File; preview: string }[]>([]);

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
   * Soporta imágenes, PDFs y documentos
   */
  protected onFileSelect(event: Event): void {
    if (!this.esEditable()) return;

    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const newFiles = Array.from(input.files);

    // Filtrar archivos permitidos
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];

    const validFiles = newFiles.filter((file) => allowedTypes.includes(file.type));

    if (validFiles.length !== newFiles.length) {
      console.warn('Algunos archivos no están permitidos');
    }

    this.archivosNuevos.update((archivos) => [...archivos, ...validFiles]);

    // Generar previews solo para imágenes
    validFiles.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.imagenesPreview.update((previews) => [
            ...previews,
            { file, preview: e.target?.result as string },
          ]);
        };
        reader.readAsDataURL(file);
      }
    });

    input.value = '';
  }

  /**
   * Elimina un archivo nuevo
   */
  protected eliminarArchivoNuevo(index: number): void {
    if (!this.esEditable()) return;

    const archivos = this.archivosNuevos();
    const archivoEliminado = archivos[index];

    this.archivosNuevos.update((archivos) => archivos.filter((_, i) => i !== index));

    // Eliminar preview si es imagen
    if (archivoEliminado.type.startsWith('image/')) {
      this.imagenesPreview.update((previews) =>
        previews.filter((p) => p.file !== archivoEliminado)
      );
    }
  }

  /**
   * Elimina un archivo existente
   * Marca el archivo para eliminación en el servidor
   */
  protected eliminarArchivoExistente(index: number): void {
    if (!this.esEditable()) return;

    const archivos = this.archivosExistentes();
    const archivoEliminado = archivos[index];

    // Guardar ID para eliminación posterior
    this.archivosEliminadosIds.update((ids) => [...ids, archivoEliminado.id]);

    // Remover de la lista
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
      archivosEliminadosIds: this.archivosEliminadosIds(),
    });
  }

  /**
   * Obtiene la URL de visualización de un archivo
   */
  protected getArchivoUrl(archivo: Archivo): string {
    if (archivo.url) {
      return archivo.url;
    }
    if (archivo.ruta) {
      return this.archivoService.getUrlVisualizacion(archivo.ruta);
    }
    return '';
  }

  /**
   * Obtiene el preview de un archivo nuevo
   */
  protected getPreviewNuevo(file: File): string {
    const preview = this.imagenesPreview().find((p) => p.file === file);
    return preview?.preview || '';
  }

  /**
   * Descarga un archivo
   */
  protected descargarArchivo(archivo: Archivo): void {
    this.archivoService.descargarArchivo(archivo.id);
  }

  /**
   * Cancela la edición
   */
  protected cancelar(): void {
    this.dialogRef.close();
  }

  /**
   * Elimina la observación
   */
  protected eliminar(): void {
    // Cerrar el diálogo con un valor especial para indicar eliminación
    this.dialogRef.close('DELETE');
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
