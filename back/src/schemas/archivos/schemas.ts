import type { FastifySchema } from 'fastify';

/**
 * Schema para subir archivo
 */
export const subirArchivoSchema: FastifySchema = {
  description: 'Sube un archivo al servidor',
  tags: ['Archivos'],
  consumes: ['multipart/form-data'],
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    properties: {
      file: {
        type: 'object',
        description: 'Archivo a subir (máx 50MB)',
      },
      observacionId: {
        type: 'string',
        description:
          'ID de la observación a la que pertenece el archivo (opcional)',
        example: '1',
      },
    },
    required: ['file'],
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '1' },
        nombre: { type: 'string', example: 'documento.pdf' },
        tipo: { type: 'string', example: 'application/pdf' },
        tamano: { type: 'string', example: '1048576' },
        ruta: { type: 'string', nullable: true, example: 'pdf/abc123.pdf' },
        url: { type: 'string', nullable: true, example: null },
        categoria: { type: 'string', example: 'pdf' },
        hash: { type: 'string', example: 'abc123...' },
        observacionId: { type: 'string', nullable: true, example: '1' },
        creadoEn: { type: 'string', format: 'date-time' },
      },
    },
    400: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        error: { type: 'string', example: 'Bad Request' },
        message: { type: 'string', example: 'Tipo de archivo no permitido' },
      },
    },
    413: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 413 },
        error: { type: 'string', example: 'Payload Too Large' },
        message: {
          type: 'string',
          example: 'Archivo demasiado grande (máx 50MB)',
        },
      },
    },
  },
};

/**
 * Schema para guardar URL externa
 */
export const guardarUrlSchema: FastifySchema = {
  description: 'Guarda una URL externa sin descargar el archivo',
  tags: ['Archivos'],
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        format: 'uri',
        description: 'URL del archivo externo',
        example: 'https://example.com/documento.pdf',
      },
      nombre: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        description: 'Nombre descriptivo del archivo',
        example: 'Documento importante',
      },
      observacionId: {
        type: 'string',
        description: 'ID de la observación (opcional)',
        example: '1',
      },
    },
    required: ['url', 'nombre'],
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        nombre: { type: 'string' },
        tipo: { type: 'string' },
        tamano: { type: 'string' },
        ruta: { type: 'string', nullable: true },
        url: { type: 'string', nullable: true },
        categoria: { type: 'string' },
        hash: { type: 'string' },
        creadoEn: { type: 'string', format: 'date-time' },
      },
    },
  },
};

/**
 * Schema para obtener un archivo
 */
export const obtenerArchivoSchema: FastifySchema = {
  description: 'Obtiene información de un archivo por ID',
  tags: ['Archivos'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'ID del archivo',
        example: '1',
      },
    },
    required: ['id'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        nombre: { type: 'string' },
        tipo: { type: 'string' },
        tamano: { type: 'string' },
        ruta: { type: 'string', nullable: true },
        url: { type: 'string', nullable: true },
        categoria: { type: 'string' },
        hash: { type: 'string' },
        observacionId: { type: 'string', nullable: true },
        creadoPor: { type: 'number' },
        creadoEn: { type: 'string', format: 'date-time' },
        actualizadoPor: { type: 'number', nullable: true },
        actualizadoEn: { type: 'string', format: 'date-time', nullable: true },
      },
    },
    404: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        error: { type: 'string', example: 'Not Found' },
        message: { type: 'string', example: 'Archivo no encontrado' },
      },
    },
  },
};

/**
 * Schema para descargar un archivo
 */
export const descargarArchivoSchema: FastifySchema = {
  description: 'Descarga un archivo',
  tags: ['Archivos'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID del archivo' },
    },
    required: ['id'],
  },
};

/**
 * Schema para listar archivos
 */
export const listarArchivosSchema: FastifySchema = {
  description: 'Lista archivos con paginación y filtros',
  tags: ['Archivos'],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      categoria: {
        type: 'string',
        enum: ['imagen', 'documento', 'pdf', 'video', 'otro'],
        description: 'Filtrar por categoría',
      },
      observacionId: {
        type: 'string',
        description: 'Filtrar por observación',
      },
      page: {
        type: 'integer',
        minimum: 1,
        default: 1,
        description: 'Número de página',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 20,
        description: 'Archivos por página',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        archivos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              nombre: { type: 'string' },
              tipo: { type: 'string' },
              tamano: { type: 'string' },
              categoria: { type: 'string' },
              url: { type: 'string', nullable: true },
              creadoEn: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  },
};

/**
 * Schema para actualizar archivo
 */
export const actualizarArchivoSchema: FastifySchema = {
  description: 'Actualiza información de un archivo',
  tags: ['Archivos'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID del archivo' },
    },
    required: ['id'],
  },
  body: {
    type: 'object',
    properties: {
      nombre: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        description: 'Nuevo nombre del archivo',
      },
      observacionId: {
        type: ['string', 'null'],
        description: 'Nueva observación o null para desvincular',
      },
    },
    minProperties: 1,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        nombre: { type: 'string' },
        observacionId: { type: 'string', nullable: true },
        actualizadoEn: { type: 'string', format: 'date-time' },
      },
    },
  },
};

/**
 * Schema para eliminar archivo
 */
export const eliminarArchivoSchema: FastifySchema = {
  description: 'Elimina un archivo',
  tags: ['Archivos'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'ID del archivo a eliminar',
      },
    },
    required: ['id'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Archivo eliminado correctamente' },
      },
    },
    404: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        error: { type: 'string', example: 'Not Found' },
        message: { type: 'string', example: 'Archivo no encontrado' },
      },
    },
  },
};
