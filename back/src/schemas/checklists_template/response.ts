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

/**
 * Schema de respuesta para crear template
 */
export const createTemplateResponseSchema = {
  description: 'Template creado exitosamente',
  type: 'object',
  required: ['success', 'message', 'template'],
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    template: {
      type: 'object',
      required: ['id', 'nombre'],
      properties: {
        id: { type: 'number' },
        nombre: { type: 'string' },
      },
    },
  },
} as const;

/**
 * Schema de respuesta para crear sección
 */
export const createSeccionResponseSchema = {
  description: 'Sección creada exitosamente',
  type: 'object',
  required: ['success', 'message', 'seccion'],
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    seccion: {
      type: 'object',
      required: ['id', 'nombre', 'templateId', 'orden'],
      properties: {
        id: { type: 'number' },
        nombre: { type: 'string' },
        templateId: { type: 'number' },
        orden: { type: 'number' },
      },
    },
  },
} as const;

/**
 * Schema de respuesta para actualizar template
 */
export const updateTemplateResponseSchema = {
  description: 'Template actualizado exitosamente',
  type: 'object',
  required: ['success', 'message', 'template'],
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    template: {
      type: 'object',
      required: ['id', 'nombre'],
      properties: {
        id: { type: 'number' },
        nombre: { type: 'string' },
      },
    },
  },
} as const;

/**
 * Schema de respuesta para actualizar sección
 */
export const updateSeccionResponseSchema = {
  description: 'Sección actualizada exitosamente',
  type: 'object',
  required: ['success', 'message', 'seccion'],
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    seccion: {
      type: 'object',
      required: ['id', 'nombre', 'templateId', 'orden'],
      properties: {
        id: { type: 'number' },
        nombre: { type: 'string' },
        templateId: { type: 'number' },
        orden: { type: 'number' },
      },
    },
  },
} as const;

/**
 * Schema de respuesta para eliminar template
 */
export const deleteTemplateResponseSchema = {
  description: 'Template eliminado exitosamente',
  type: 'object',
  required: ['success', 'message'],
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
} as const;

/**
 * Schema de respuesta para eliminar sección
 */
export const deleteSeccionResponseSchema = {
  description: 'Sección eliminada exitosamente',
  type: 'object',
  required: ['success', 'message'],
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
} as const;
