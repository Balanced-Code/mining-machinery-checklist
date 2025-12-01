/**
 * Modelos de datos para Inspecciones
 */

/**
 * Datos completos de una inspección desde la BD
 */
export interface InspeccionData {
  id: bigint;
  fechaInicio: Date;
  fechaFinalizacion: Date | null;
  maquinaId: number;
  numSerie: string;
  nSerieMotor: string | null;
  cabinado: boolean | null;
  horometro: number | null;
  creadoPor: number;
  creadoEn: Date;
  actualizadoPor: number | null;
  actualizadoEn: Date | null;
  eliminadoPor: number | null;
  eliminadoEn: Date | null;
  // Relaciones opcionales (cuando se usa include)
  maquina?: {
    id: number;
    nombre: string;
  };
  creador?: {
    id: number;
    nombre: string;
    correo: string;
  };
  asignaciones?: Array<{
    id: bigint;
    inspeccionId: bigint;
    usuarioId: number;
    rolAsignacionId: number;
    usuario: {
      id: number;
      nombre: string;
      correo: string;
    };
    rolAsignacion: {
      id: number;
      nombre: string;
    };
  }>;
}

/**
 * Datos para crear una nueva inspección (básicos)
 */
export interface CreateInspeccionData {
  fechaInicio: Date;
  maquinaId: number;
  numSerie: string;
  nSerieMotor?: string | undefined;
  cabinado?: boolean | undefined;
  horometro?: number | undefined;
}

/**
 * Datos completos para crear inspección con checklists
 */
export interface CreateInspeccionCompleteData extends CreateInspeccionData {
  fechaFinalizacion?: Date | undefined;
  templateIds: number[]; // IDs de templates a incluir
}

/**
 * Datos para actualizar una inspección
 */
export interface UpdateInspeccionData {
  fechaInicio?: Date | undefined;
  fechaFinalizacion?: Date | undefined;
  numSerie?: string | undefined;
  nSerieMotor?: string | undefined;
  cabinado?: boolean | undefined;
  horometro?: number | undefined;
}
