import { errorsResponseSchema } from '../common/errors';
import {
  inspeccionesListaResponseSchema,
  inspeccionVistaSchema,
  deleteInspeccionResponseSchema,
  createInspeccionResponseSchema,
  updateInspeccionResponseSchema,
} from './response';
import {
  inspeccionIdParamSchema,
  createInspeccionBodySchema,
  updateInspeccionBodySchema,
} from './request';

/**
 * Schema completo para GET /inspecciones
 */
export const getInspeccionesSchema = {
  description: 'Obtener lista de inspecciones',
  tags: ['inspecciones'],
  response: {
    200: inspeccionesListaResponseSchema,
    401: errorsResponseSchema,
    500: errorsResponseSchema,
  },
} as const;

/**
 * Schema completo para GET /inspecciones/:id
 */
export const getInspeccionByIdSchema = {
  description: 'Obtener una inspección por ID',
  tags: ['inspecciones'],
  params: inspeccionIdParamSchema,
  response: {
    200: inspeccionVistaSchema,
    401: errorsResponseSchema,
    404: errorsResponseSchema,
    500: errorsResponseSchema,
  },
} as const;

/**
 * Schema completo para POST /inspecciones
 */
export const createInspeccionSchema = {
  description: 'Crear una nueva inspección con checklists',
  tags: ['inspecciones'],
  body: createInspeccionBodySchema,
  response: {
    201: createInspeccionResponseSchema,
    400: errorsResponseSchema,
    401: errorsResponseSchema,
    403: errorsResponseSchema,
    404: errorsResponseSchema, // Máquina o template no encontrado
    500: errorsResponseSchema,
  },
} as const;

/**
 * Schema completo para PATCH /inspecciones/:id
 */
export const updateInspeccionSchema = {
  description: 'Actualizar una inspección existente',
  tags: ['inspecciones'],
  params: inspeccionIdParamSchema,
  body: updateInspeccionBodySchema,
  response: {
    200: updateInspeccionResponseSchema,
    400: errorsResponseSchema,
    401: errorsResponseSchema,
    403: errorsResponseSchema,
    404: errorsResponseSchema,
    500: errorsResponseSchema,
  },
} as const;

/**
 * Schema completo para DELETE /inspecciones/:id
 */
export const deleteInspeccionSchema = {
  description: 'Eliminar una inspección (soft delete)',
  tags: ['inspecciones'],
  params: inspeccionIdParamSchema,
  response: {
    200: deleteInspeccionResponseSchema,
    401: errorsResponseSchema,
    403: errorsResponseSchema,
    404: errorsResponseSchema,
    500: errorsResponseSchema,
  },
} as const;
