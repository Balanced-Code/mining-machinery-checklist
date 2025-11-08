/**
 * Modelos de datos para el módulo de Historial de Inspecciones
 */

/**
 * Información básica de una máquina
 */
export interface Maquina {
  id: number;
  nombre: string; // Modelo de la máquina (ej: CAT 320D, VOLVO L90H)
}

/**
 * Usuario asignado a una inspección
 */
export interface UsuarioInspeccion {
  id: number;
  nombre: string;
  correo: string;
}

/**
 * Rol que puede tener un usuario en una inspección
 */
export interface RolAsignacion {
  id: number;
  nombre: string; // Ej: "Inspector", "Supervisor", "Técnico"
}

/**
 * Asignación de un usuario con un rol específico a una inspección
 */
export interface AsignacionInspeccion {
  id: number;
  inspeccionId: number;
  usuarioId: number;
  rolAsignacionId: number;
  usuario?: UsuarioInspeccion;
  rol?: RolAsignacion;
}

/**
 * Archivo adjunto a una observación
 */
export interface Archivo {
  id: number;
  nombre: string;
  tipo: string;
  tamano: number; // bytes
  ruta: string;
  hash: string;
  observacionId?: number;
}

/**
 * Observación asociada a un resultado de checklist
 */
export interface Observacion {
  id: number;
  descripcion: string;
  archivos?: Archivo[];
  creadoPor?: number;
  creadoEn?: Date;
}

/**
 * Resultado de verificación de un ítem del checklist
 * cumple: true = Sí, false = No, null = N/A
 */
export interface ResultadoAtributoChecklist {
  id: number;
  cumple: boolean | null; // true=Sí, false=No, null=N/A
  observacionId?: number;
  observacion?: Observacion;
}

/**
 * Respuesta a un ítem específico de un checklist en una inspección
 */
export interface EleccionRespuesta {
  id: number;
  eleccionTemplateId: number; // A qué checklist pertenece
  templateSeccionId: number; // Qué ítem está respondiendo
  resultadoAtributoChecklistId: number;
  resultado?: ResultadoAtributoChecklist;
}

/**
 * Template de checklist seleccionado para una inspección
 */
export interface EleccionTemplate {
  id: number;
  templateId: number;
  templateNombre?: string; // Para mostrar en UI
  inspeccionId: number;
  respuestas?: EleccionRespuesta[];
}

/**
 * Inspección de maquinaria
 * Coincide con el schema de Prisma
 */
export interface Inspeccion {
  id: number;
  fechaInicio: string; // ISO 8601 date string o Date
  fechaFinalizacion: string | null; // null si está en progreso
  maquinaId: number; // Foreign key a Maquina
  numSerie: string; // Número de serie de la máquina (ej: EQA-2232)
  nSerieMotor?: string | null;
  cabinado?: boolean | null;
  horometro?: number | null; // Horas de uso
  creadoPor: number;
  creadoEn?: Date;
  actualizadoPor?: number;
  actualizadoEn?: Date;
  eliminadoPor?: number;
  eliminadoEn?: Date;
  // Relaciones populadas (para mostrar en UI)
  maquina?: Maquina;
  inspector?: UsuarioInspeccion; // Creador de la inspección
  supervisor?: UsuarioInspeccion;
  tecnicoMecanico?: UsuarioInspeccion;
  eleccionesTemplate?: EleccionTemplate[];
  asignaciones?: AsignacionInspeccion[];
}

/**
 * Estado de una inspección
 */
export type EstadoInspeccion = 'todas' | 'completadas' | 'en_progreso';

/**
 * Dirección de ordenamiento
 */
export type DireccionOrdenamiento = 'asc' | 'desc' | null;

/**
 * Columnas ordenables de la tabla
 */
export type ColumnaOrdenable =
  | 'numSerie'
  | 'maquina'
  | 'fechaInicio'
  | 'fechaFinalizacion'
  | 'inspector';

/**
 * Configuración de ordenamiento
 */
export interface ConfigOrdenamiento {
  columna: ColumnaOrdenable | null;
  direccion: DireccionOrdenamiento;
}

/**
 * Filtros aplicados a la tabla
 */
export interface FiltrosInspeccion {
  busqueda: string;
  estado: EstadoInspeccion;
  ordenamiento: ConfigOrdenamiento;
}

/**
 * Respuesta paginada de inspecciones (para cuando se integre con backend)
 */
export interface InspeccionesResponse {
  inspecciones: Inspeccion[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

/**
 * Respuesta de operaciones sobre inspecciones
 */
export interface InspeccionOperationResponse {
  success: boolean;
  message: string;
  inspeccion?: Inspeccion;
}

// ============================================================================
// DTOs PARA VISTA Y FORMULARIOS
// ============================================================================

/**
 * DTO para mostrar un ítem de checklist con su estado de respuesta
 */
export interface InspeccionItemDTO {
  templateSeccionId: number;
  orden: number;
  descripcion: string;
  cumple: boolean | null; // true=Sí, false=No, null=N/A o sin responder
  observacion?: Observacion;
  eleccionRespuestaId?: number;
  resultadoId?: number;
}

/**
 * DTO para mostrar un checklist completo dentro de una inspección
 */
export interface InspeccionChecklistDTO {
  eleccionTemplateId?: number; // undefined si aún no está guardado
  templateId: number;
  nombreTemplate: string;
  items: InspeccionItemDTO[];
  completado: boolean; // Todos los ítems respondidos
  progresoSI: number;
  progresoNO: number;
  progresoNA: number;
  progresoTotal: number;
}

/**
 * DTO para crear/editar una inspección
 */
export interface InspeccionFormDTO {
  // Datos básicos
  fechaInicio: string;
  numSerie: string;
  maquinaId: number;
  nSerieMotor?: string;
  cabinado?: boolean;
  horometro?: number;

  // Roles (Inspector es automático = usuario actual)
  supervisorId?: number;
  tecnicoIds?: number[]; // Puede haber múltiples técnicos

  // Checklists seleccionados
  templateIds: number[];
}

/**
 * DTO para respuesta a un ítem del checklist
 */
export interface RespuestaItemDTO {
  templateSeccionId: number;
  cumple: boolean | null;
  observacion?: {
    id?: number; // Para edición de observación existente
    descripcion: string;
    archivosNuevos?: File[]; // Para upload de nuevas imágenes
    archivosExistentes?: Archivo[]; // Para mantener imágenes existentes
  };
}

/**
 * DTO completo para guardar una inspección
 */
export interface GuardarInspeccionDTO {
  inspeccion: InspeccionFormDTO;
  respuestas: Map<number, RespuestaItemDTO[]>; // Map<eleccionTemplateId, respuestas[]>
}

// ============================================================================
// TIPOS AUXILIARES
// ============================================================================

/**
 * Estado de cumplimiento de un ítem
 */
export type EstadoCumplimiento = 'SI' | 'NO' | 'NA' | null;

/**
 * Modo de visualización del formulario
 */
export type ModoInspeccion = 'crear' | 'editar' | 'ver';

/**
 * Resumen de progreso de una inspección
 */
export interface ResumenInspeccion {
  totalItems: number;
  itemsSI: number;
  itemsNO: number;
  itemsNA: number;
  itemsIncompletos: number;
  porcentajeCompletado: number;
  completado: boolean; // Todos los ítems respondidos
}
