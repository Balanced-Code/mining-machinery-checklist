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
        modelo: { type: 'string' },
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
