import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface ArchivoResponse {
  id: string;
  nombre: string;
  tipo: string;
  tamano: string;
  ruta: string | null;
  url: string | null;
  categoria: string;
  hash: string;
  observacionId: string | null;
  creadoPor: number;
  creadoEn: string;
  actualizadoPor: number | null;
  actualizadoEn: string | null;
}

export interface ListarArchivosParams {
  categoria?: 'imagen' | 'documento' | 'pdf' | 'video' | 'otro';
  observacionId?: string;
  page?: number;
  limit?: number;
}

export interface ListarArchivosResponse {
  archivos: ArchivoResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root',
})
export class ArchivoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/archivos';

  /**
   * Sube un archivo al servidor
   * @param file Archivo a subir
   * @param observacionId ID de la observación (opcional)
   * @returns Información del archivo subido
   */
  async subirArchivo(file: File, observacionId?: string): Promise<ArchivoResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (observacionId) {
      formData.append('observacionId', observacionId);
    }

    return firstValueFrom(this.http.post<ArchivoResponse>(`${this.baseUrl}/upload`, formData));
  }

  /**
   * Guarda una URL externa sin descargar el archivo
   * @param url URL del archivo externo
   * @param nombre Nombre descriptivo
   * @param observacionId ID de la observación (opcional)
   * @returns Información del archivo guardado
   */
  async guardarUrlExterna(
    url: string,
    nombre: string,
    observacionId?: string
  ): Promise<ArchivoResponse> {
    return firstValueFrom(
      this.http.post<ArchivoResponse>(`${this.baseUrl}/url`, {
        url,
        nombre,
        observacionId,
      })
    );
  }

  /**
   * Obtiene información de un archivo por ID
   * @param id ID del archivo
   * @returns Información del archivo
   */
  async obtenerArchivo(id: string): Promise<ArchivoResponse> {
    return firstValueFrom(this.http.get<ArchivoResponse>(`${this.baseUrl}/${id}`));
  }

  /**
   * Lista archivos con paginación y filtros
   * @param params Parámetros de búsqueda
   * @returns Lista de archivos
   */
  async listarArchivos(params?: ListarArchivosParams): Promise<ListarArchivosResponse> {
    let httpParams = new HttpParams();

    if (params?.categoria) {
      httpParams = httpParams.set('categoria', params.categoria);
    }
    if (params?.observacionId) {
      httpParams = httpParams.set('observacionId', params.observacionId);
    }
    if (params?.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return firstValueFrom(
      this.http.get<ListarArchivosResponse>(this.baseUrl, {
        params: httpParams,
      })
    );
  }

  /**
   * Actualiza información de un archivo
   * @param id ID del archivo
   * @param datos Datos a actualizar
   * @returns Información del archivo actualizado
   */
  async actualizarArchivo(
    id: string,
    datos: { nombre?: string; observacionId?: string | null }
  ): Promise<ArchivoResponse> {
    return firstValueFrom(this.http.patch<ArchivoResponse>(`${this.baseUrl}/${id}`, datos));
  }

  /**
   * Elimina un archivo
   * @param id ID del archivo
   * @returns Mensaje de confirmación
   */
  async eliminarArchivo(id: string): Promise<{ message: string }> {
    return firstValueFrom(this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`));
  }

  /**
   * Obtiene la URL de descarga de un archivo
   * @param id ID del archivo
   * @returns URL de descarga
   */
  getUrlDescarga(id: string): string {
    return `${this.baseUrl}/${id}/download`;
  }

  /**
   * Obtiene la URL de visualización de un archivo (para imágenes)
   * @param ruta Ruta del archivo en el servidor
   * @returns URL completa del archivo
   */
  getUrlVisualizacion(ruta: string): string {
    return `http://localhost:3000/uploads/${ruta}`;
  }

  /**
   * Descarga un archivo forzando la descarga
   * @param id ID del archivo
   */
  async descargarArchivo(id: string): Promise<void> {
    try {
      // Obtener información del archivo primero para conocer el nombre
      const info = await this.obtenerArchivo(id);

      // Descargar el archivo como blob
      const blob = await firstValueFrom(
        this.http.get(this.getUrlDescarga(id), {
          responseType: 'blob',
        })
      );

      // Crear URL del blob
      const url = window.URL.createObjectURL(blob);

      // Crear elemento de descarga
      const link = document.createElement('a');
      link.href = url;
      link.download = info.nombre; // Usar el nombre original del archivo
      document.body.appendChild(link);
      link.click();

      // Limpiar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar archivo:', error);
      throw error;
    }
  }

  /**
   * Determina el ícono Material para un tipo de archivo
   * @param tipo MIME type del archivo
   * @returns Nombre del ícono Material
   */
  getIconoPorTipo(tipo: string): string {
    if (tipo.startsWith('image/')) return 'image';
    if (tipo === 'application/pdf') return 'picture_as_pdf';
    if (tipo.includes('word') || tipo.includes('document') || tipo === 'text/plain')
      return 'description';
    if (tipo.includes('excel') || tipo.includes('spreadsheet')) return 'table_chart';
    if (tipo.startsWith('video/')) return 'video_file';
    return 'insert_drive_file';
  }

  /**
   * Formatea el tamaño de archivo a una cadena legible
   * @param bytes Tamaño en bytes
   * @returns Tamaño formateado (ej: "1.5 MB")
   */
  formatearTamano(bytes: string | number): string {
    const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (num === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(num) / Math.log(k));

    return Math.round((num / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
