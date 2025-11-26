/**
 * Schema de una sección individual del template
 */
export const templateSeccionVistaSchema = {
  type: 'object',
  required: ['id', 'nombre', 'orden'],
  properties: {
    id: { type: 'number' },
    nombre: { type: 'string' },
    orden: { type: 'number' },
  },
} as const;

/**
 * Schema de template individual con sus secciones
 */
export const templateVistaSchema = {
  type: 'object',
  required: ['id', 'nombre', 'secciones'],
  properties: {
    id: { type: 'number' },
    nombre: { type: 'string' },
    secciones: {
      type: 'array',
      items: templateSeccionVistaSchema,
    },
  },
} as const;

/**
 * Schema de respuesta para lista de templates
 */
export const templatesListaResponseSchema = {
  description: 'Lista de templates de checklist con sus secciones',
  type: 'object',
  required: ['temps', 'total'],
  properties: {
    temps: {
      type: 'array',
      items: templateVistaSchema,
    },
    total: { type: 'number' },
  },
} as const;
