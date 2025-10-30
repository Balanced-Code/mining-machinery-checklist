import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

async function swaggerPlugin(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Mining Machinery Checklist API',
        description:
          'API completa para gestión de checklists de maquinaria minera, usuarios y autenticación',
        version: '1.0.0',
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      // Configuraciones básicas de visualización
      deepLinking: false, // Evitar problemas con deep linking
      docExpansion: 'none', // Solo expandir tags, no operaciones individuales

      // Configuraciones para "Try it out"
      supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'], // Métodos soportados
      displayRequestDuration: true, // Mostrar duración de requests

      // Filtros y búsqueda (ÚNICA opción de búsqueda disponible)
      filter: true, // Habilitar filtro de búsqueda

      // Ordenamiento para mejor navegación
      operationsSorter: 'method', // Ordenar operaciones alfabéticamente
      tagsSorter: 'alpha', // Ordenar tags alfabéticamente

      // Mostrar información adicional
      showExtensions: true, // Mostrar extensiones OpenAPI
      showCommonExtensions: true, // Mostrar extensiones comunes
      defaultModelRendering: 'example', // Mostrar ejemplos por defecto

      // Configuración de respuestas
      showMutatedRequest: true, // Mostrar request modificado en cURL
    },
    staticCSP: false, // Deshabilitado para mejor compatibilidad
  });

  app.log.info('Plugin Swagger UI registrado correctamente');
}

export default fp(swaggerPlugin, {
  name: 'swaggerPlugin',
});
