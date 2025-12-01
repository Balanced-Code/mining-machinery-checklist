/**
 * Schemas de validación para response de inspecciones
 */

/**
 * Schema para una inspección individual
 */
export const inspeccionVistaSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' }, // BigInt serializado como string
    fechaInicio: { type: 'string' },
    fechaFinalizacion: { type: ['string', 'null'] },
    maquinaId: { type: 'number' },
    numSerie: { type: 'string' },
    nSerieMotor: { type: ['string', 'null'] },
    cabinado: { type: ['boolean', 'null'] },
    horometro: { type: ['number', 'null'] },
    creadoPor: { type: 'number' },
    maquina: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        nombre: { type: 'string' },
      },
    },
    creador: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        nombre: { type: 'string' },
        correo: { type: 'string' },
      },
    },
    asignaciones: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' }, // BigInt serializado
          inspeccionId: { type: 'string' }, // BigInt serializado
          usuarioId: { type: 'number' },
          rolAsignacionId: { type: 'number' },
          usuario: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              nombre: { type: 'string' },
              correo: { type: 'string' },
            },
          },
          rolAsignacion: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              nombre: { type: 'string' },
            },
          },
        },
      },
    },
  },
} as const;

/**
 * Schema para lista de inspecciones
 */
export const inspeccionesListaResponseSchema = {
  type: 'object',
  properties: {
    inspecciones: {
      type: 'array',
      items: inspeccionVistaSchema,
    },
    total: { type: 'number' },
  },
  required: ['inspecciones', 'total'],
} as const;

/**
 * Schema para respuesta de eliminación
 */
export const deleteInspeccionResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
  required: ['success', 'message'],
} as const;

/**
 * Schema para respuesta de creación
 */
export const createInspeccionResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    inspeccion: inspeccionVistaSchema,
  },
  required: ['success', 'message', 'inspeccion'],
} as const;

/**
 * Schema para respuesta de actualización
 */
export const updateInspeccionResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    inspeccion: inspeccionVistaSchema,
  },
  required: ['success', 'message', 'inspeccion'],
} as const;

/**
 * Schema para respuesta de guardar respuesta
 */
export const guardarRespuestaResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    eleccionRespuesta: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        eleccionTemplateId: { type: 'number' },
        templateSeccionId: { type: 'number' },
        resultadoAtributoChecklistId: { type: 'string' }, // BigInt
      },
    },
  },
  required: ['success', 'message'],
} as const;

/**
 * Schema para un ítem de checklist
 */
export const checklistItemSchema = {
  type: 'object',
  properties: {
    templateSeccionId: { type: 'number' },
    orden: { type: 'number' },
    descripcion: { type: 'string' },
    cumple: { type: ['boolean', 'null'] },
    observacion: {
      type: ['object', 'null'],
      properties: {
        id: { type: 'string' }, // BigInt
        descripcion: { type: 'string' },
        archivos: { type: 'array' },
      },
    },
    eleccionRespuestaId: { type: ['number', 'null'] },
    resultadoId: { type: ['string', 'null'] }, // BigInt
  },
} as const;

/**
 * Schema para un checklist completo
 */
export const checklistSchema = {
  type: 'object',
  properties: {
    eleccionTemplateId: { type: 'number' },
    templateId: { type: 'number' },
    nombreTemplate: { type: 'string' },
    items: {
      type: 'array',
      items: checklistItemSchema,
    },
    completado: { type: 'boolean' },
    progresoSI: { type: 'number' },
    progresoNO: { type: 'number' },
    progresoNA: { type: 'number' },
    progresoTotal: { type: 'number' },
  },
} as const;

/**
 * Schema para respuesta de checklists de una inspección
 */
export const checklistsResponseSchema = {
  type: 'object',
  properties: {
    checklists: {
      type: 'array',
      items: checklistSchema,
    },
  },
  required: ['checklists'],
} as const;

/**
 * Schema para respuesta de terminar inspección
 */
export const terminarInspeccionResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    inspeccion: inspeccionVistaSchema,
  },
  required: ['success', 'message', 'inspeccion'],
} as const;
