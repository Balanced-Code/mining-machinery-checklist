/**
 * Modelos de datos para archivos
 */

/**
 * Categorías de archivos permitidas
 */
export enum CategoriaArchivo {
  IMAGEN = 'imagen',
  DOCUMENTO = 'documento',
  PDF = 'pdf',
  VIDEO = 'video',
  OTRO = 'otro',
}

/**
 * Body para peticiones HTTP
 */
export interface GuardarUrlBody {
  url: string;
  nombre: string;
  observacionId?: string;
}

export interface ArchivoParams {
  id: string;
}

export interface ListarArchivosQuery {
  categoria?: 'imagen' | 'documento' | 'pdf' | 'video' | 'otro';
  observacionId?: string;
  page?: number;
  limit?: number;
}

export interface ActualizarArchivoBody {
  nombre?: string;
  observacionId?: string | null;
}

/**
 * Respuestas HTTP (strings para JSON)
 */
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

export interface ListarArchivosResponse {
  archivos: ArchivoResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Modelos internos del servicio (con tipos nativos)
 */
export interface ArchivoDetails {
  id: bigint;
  nombre: string;
  tipo: string;
  tamano: bigint;
  ruta: string | null;
  url: string | null;
  categoria: string;
  hash: string;
  observacionId: bigint | null;
  creadoPor: number;
  creadoEn: Date;
  actualizadoPor: number | null;
  actualizadoEn: Date | null;
}

export interface ListarArchivosParams {
  categoria?: CategoriaArchivo;
  observacionId?: bigint;
  page?: number;
  limit?: number;
}

export interface ActualizarArchivoParams {
  nombre?: string;
  observacionId?: bigint | null;
}
