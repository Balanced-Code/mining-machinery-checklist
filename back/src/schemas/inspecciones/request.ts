/**
 * Schemas de validación para request de inspecciones
 */

/**
 * Schema para validar ID de inspección en parámetros
 */
export const inspeccionIdParamSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'string', // BigInt viene como string en URL
      pattern: '^[0-9]+$',
    },
  },
} as const;

/**
 * Schema para crear una nueva inspección
 */
export const createInspeccionBodySchema = {
  type: 'object',
  required: ['fechaInicio', 'maquinaId', 'numSerie', 'templateIds'],
  properties: {
    fechaInicio: {
      type: 'string',
      format: 'date-time',
    },
    fechaFinalizacion: {
      type: ['string', 'null'],
      format: 'date-time',
    },
    maquinaId: {
      type: 'number',
      minimum: 1,
    },
    numSerie: {
      type: 'string',
      minLength: 1,
      maxLength: 50,
    },
    nSerieMotor: {
      type: ['string', 'null'],
      maxLength: 50,
    },
    cabinado: {
      type: ['boolean', 'null'],
    },
    horometro: {
      type: ['number', 'null'],
      minimum: 0,
    },
    templateIds: {
      type: 'array',
      items: {
        type: 'number',
        minimum: 1,
      },
      minItems: 1,
      uniqueItems: true,
    },
  },
} as const;

/**
 * Schema para actualizar una inspección existente
 */
export const updateInspeccionBodySchema = {
  type: 'object',
  properties: {
    fechaInicio: {
      type: 'string',
      format: 'date-time',
    },
    fechaFinalizacion: {
      type: ['string', 'null'],
      format: 'date-time',
    },
    numSerie: {
      type: 'string',
      minLength: 1,
      maxLength: 50,
    },
    nSerieMotor: {
      type: ['string', 'null'],
      maxLength: 50,
    },
    cabinado: {
      type: ['boolean', 'null'],
    },
    horometro: {
      type: ['number', 'null'],
      minimum: 0,
    },
    // No permitimos cambiar maquinaId
    // No permitimos cambiar templateIds (solo agregar/eliminar en endpoints específicos)
  },
} as const;
