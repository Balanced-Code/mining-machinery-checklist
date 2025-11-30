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
  required: ['fechaInicio', 'maquinaId'],
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
      type: ['string', 'null'],
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
    supervisorId: {
      type: ['number', 'null'],
      minimum: 1,
    },
    tecnicoIds: {
      type: 'array',
      items: {
        type: 'number',
        minimum: 1,
      },
      default: [],
    },
    templateIds: {
      type: 'array',
      items: {
        type: 'number',
        minimum: 1,
      },
      default: [],
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

/**
 * Schema para guardar una respuesta a un ítem del checklist
 */
export const guardarRespuestaBodySchema = {
  type: 'object',
  required: ['inspeccionId', 'templateId', 'templateSeccionId', 'cumple'],
  properties: {
    inspeccionId: {
      type: 'string', // BigInt como string
      pattern: '^[0-9]+$',
    },
    templateId: {
      type: 'number',
      minimum: 1,
    },
    templateSeccionId: {
      type: 'number',
      minimum: 1,
    },
    cumple: {
      type: ['boolean', 'null'], // true=Sí, false=No, null=N/A
    },
    observacion: {
      type: ['object', 'null'],
      properties: {
        id: {
          type: 'number', // Si existe, se actualiza la observación
        },
        descripcion: {
          type: 'string',
          minLength: 1,
        },
        // archivosExistentes se manejan por separado en un endpoint de archivos
        archivosExistentes: {
          type: 'array',
          items: {
            type: 'number', // IDs de archivos existentes a mantener
          },
        },
      },
      required: ['descripcion'],
    },
  },
} as const;
