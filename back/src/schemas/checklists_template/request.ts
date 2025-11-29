/**
 * Schema para crear un nuevo template
 */
export const createTemplateBodySchema = {
  type: 'object',
  required: ['nombre'],
  properties: {
    nombre: {
      type: 'string',
      minLength: 3,
      maxLength: 150,
    },
  },
} as const;

/**
 * Schema para crear una nueva sección de template
 */
export const createSeccionBodySchema = {
  type: 'object',
  required: ['template_id', 'nombre', 'orden'],
  properties: {
    template_id: {
      type: 'number',
      minimum: 1,
    },
    nombre: {
      type: 'string',
      minLength: 3,
      maxLength: 250,
    },
    orden: {
      type: 'number',
      minimum: 1,
      maximum: 32767, // SmallInt en PostgreSQL
    },
  },
} as const;

/**
 * Schema para actualizar un template
 */
export const updateTemplateBodySchema = {
  type: 'object',
  required: ['nombre'],
  properties: {
    nombre: {
      type: 'string',
      minLength: 3,
      maxLength: 150,
    },
  },
} as const;

/**
 * Schema para identificar template por ID en parámetros de ruta
 */
export const templateIdParamSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'number',
      minimum: 1,
    },
  },
} as const;

/**
 * Schema para actualizar una sección de template
 * Todos los campos son opcionales para permitir actualizaciones parciales
 */
export const updateSeccionBodySchema = {
  type: 'object',
  properties: {
    nombre: {
      type: 'string',
      minLength: 3,
      maxLength: 250,
    },
    orden: {
      type: 'number',
      minimum: 1,
      maximum: 32767,
    },
  },
} as const;

/**
 * Schema para identificar sección por ID en parámetros de ruta
 */
export const seccionIdParamSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'number',
      minimum: 1,
    },
  },
} as const;
