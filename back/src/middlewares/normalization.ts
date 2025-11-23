import type { FastifyInstance } from 'fastify';

// ========== SETUP FUNCTION ==========

/**
 * Configura hooks globales para normalización y serialización automática
 * Se ejecutan después del parsing pero antes de la validación/serialización
 */
export const setupNormalizationHooks = (fastify: FastifyInstance) => {
  // Hook para normalización de datos de entrada
  fastify.addHook('preValidation', async request => {
    const body = request.body as Record<string, unknown> | undefined;
    const params = request.params as Record<string, unknown> | undefined;

    // Campos que necesitan normalización
    const fieldsToNormalize = ['correo'];

    // Normalizar body
    if (body && typeof body === 'object') {
      normalizeObject(body, fieldsToNormalize);
    }

    // Normalizar params
    if (params && typeof params === 'object') {
      normalizeObject(params, fieldsToNormalize);
    }
  });

  // Hook para serialización automática de fechas
  fastify.addHook('preSerialization', async (request, reply, payload) => {
    return convertSpecificDatesToISO(payload);
  });
};

// ========== NORMALIZATION HELPERS ==========

/**
 * Normaliza múltiples campos en un objeto
 */
const normalizeObject = (obj: Record<string, unknown>, fields: string[]) => {
  for (const field of fields) {
    const value = obj[field];
    if (value && typeof value === 'string') {
      obj[field] = normalize(value);
    }
  }
};

/**
 * Función de normalización
 */
const normalize = (value: string): string => {
  return value.trim().toLowerCase();
};

// ========== DATE SERIALIZATION HELPERS ==========

/**
 * Convierte solo campos de fecha específicos (createdAt, updatedAt, deletedAt) a ISO string
 */
const convertSpecificDatesToISO = (obj: unknown): unknown => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(convertSpecificDatesToISO);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Solo convertir campos específicos de fecha
    if (isDateField(key) && value instanceof Date) {
      result[key] = value.toISOString();
    } else if (value && typeof value === 'object') {
      // Procesar objetos anidados recursivamente
      result[key] = convertSpecificDatesToISO(value);
    } else {
      result[key] = value;
    }
  }

  return result;
};

/**
 * Verifica si el campo es uno de los campos de fecha que deben ser convertidos
 */
const isDateField = (fieldName: string): boolean => {
  const dateFields = [
    'creadoEn',
    'actualizadoEn',
    'eliminadoEn',
    'fechaInicio',
    'fechaFinalizacion',
    'issuedAt',
    'expiresAt',
    'revokedAt',
    'fechaOperacion',
  ];
  return dateFields.includes(fieldName);
};
