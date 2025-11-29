import {
  createSeccionBodySchema,
  createTemplateBodySchema,
  seccionIdParamSchema,
  templateIdParamSchema,
  updateSeccionBodySchema,
  updateTemplateBodySchema,
} from './request';
import {
  createSeccionResponseSchema,
  createTemplateResponseSchema,
  deleteSeccionResponseSchema,
  deleteTemplateResponseSchema,
  templatesListaResponseSchema,
  updateSeccionResponseSchema,
  updateTemplateResponseSchema,
} from './response';

/**
 * Schema para GET /checklists_template - Lista de Templates
 */
export const getTemplatesSchema = {
  description: 'Obtener lista de templates de checklist con sus secciones',
  tags: ['Checklist'],
  response: {
    200: templatesListaResponseSchema,
    500: {
      description: 'Error interno del servidor',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
} as const;

/**
 * Schema para POST /checklists_template/create - Crear Template
 */
export const createTemplateSchema = {
  description: 'Crear un nuevo template de checklist',
  tags: ['Checklist'],
  body: createTemplateBodySchema,
  response: {
    200: createTemplateResponseSchema,
    400: {
      description: 'Datos inválidos',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    401: {
      description: 'No autorizado',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    403: {
      description:
        'Acceso denegado - Se requiere nivel de inspector o superior',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    500: {
      description: 'Error interno del servidor',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
} as const;

/**
 * Schema para POST /checklists_template/seccion/create - Crear Sección
 */
export const createSeccionSchema = {
  description: 'Crear una nueva sección para un template de checklist',
  tags: ['Checklist'],
  body: createSeccionBodySchema,
  response: {
    200: createSeccionResponseSchema,
    400: {
      description: 'Datos inválidos',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    401: {
      description: 'No autorizado',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    403: {
      description:
        'Acceso denegado - Se requiere nivel de inspector o superior',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    409: {
      description: 'Conflicto - El orden ya está ocupado en este template',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    500: {
      description: 'Error interno del servidor',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
} as const;

/**
 * Schema para PATCH /checklists_template/:id - Actualizar Template
 */
export const updateTemplateSchema = {
  description: 'Actualizar un template de checklist existente',
  tags: ['Checklist'],
  params: templateIdParamSchema,
  body: updateTemplateBodySchema,
  response: {
    200: updateTemplateResponseSchema,
    400: {
      description: 'Datos inválidos',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    401: {
      description: 'No autorizado',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    403: {
      description:
        'Acceso denegado - Se requiere nivel de inspector o superior',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    404: {
      description: 'Template no encontrado',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    500: {
      description: 'Error interno del servidor',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
} as const;

/**
 * Schema para PATCH /checklists_template/seccion/:id - Actualizar Sección
 */
export const updateSeccionSchema = {
  description: 'Actualizar una sección de template existente',
  tags: ['Checklist'],
  params: seccionIdParamSchema,
  body: updateSeccionBodySchema,
  response: {
    200: updateSeccionResponseSchema,
    400: {
      description: 'Datos inválidos',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    401: {
      description: 'No autorizado',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    403: {
      description:
        'Acceso denegado - Se requiere nivel de inspector o superior',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    404: {
      description: 'Sección no encontrada',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    409: {
      description: 'Conflicto - El orden ya está ocupado en este template',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    500: {
      description: 'Error interno del servidor',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
} as const;

/**
 * Schema para DELETE /checklists_template/:id - Eliminar Template
 */
export const deleteTemplateSchema = {
  description: 'Eliminar un template (hard o soft delete según uso)',
  tags: ['Checklist'],
  params: templateIdParamSchema,
  response: {
    200: deleteTemplateResponseSchema,
    401: {
      description: 'No autorizado',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    403: {
      description:
        'Acceso denegado - Se requiere nivel de inspector o superior',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    404: {
      description: 'Template no encontrado',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    500: {
      description: 'Error interno del servidor',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
} as const;

/**
 * Schema para DELETE /checklists_template/seccion/:id - Eliminar Sección
 */
export const deleteSeccionSchema = {
  description: 'Eliminar una sección (hard o soft delete según uso)',
  tags: ['Checklist'],
  params: seccionIdParamSchema,
  response: {
    200: deleteSeccionResponseSchema,
    401: {
      description: 'No autorizado',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    403: {
      description:
        'Acceso denegado - Se requiere nivel de inspector o superior',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    404: {
      description: 'Sección no encontrada',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    500: {
      description: 'Error interno del servidor',
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
} as const;
