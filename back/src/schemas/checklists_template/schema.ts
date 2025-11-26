import { templatesListaResponseSchema } from './response';

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
