<div align="center">

# Mining Machinery Checklist

### Sistema de Gestión de Inspecciones para Maquinaria Minera

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Angular](https://img.shields.io/badge/Angular-20-red?logo=angular&logoColor=white)](https://angular.dev/)
[![Fastify](https://img.shields.io/badge/Fastify-5.6-black?logo=fastify&logoColor=white)](https://fastify.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## Descripción

Sistema completo de gestión de inspecciones para maquinaria minera que permite crear checklists personalizados, realizar inspecciones detalladas, asignar roles, generar reportes y mantener un historial completo de auditoría.

## Características Principales

- **Autenticación y Autorización** - Sistema JWT con gestión de sesiones y tokens
- **Templates Personalizables** - Crea y administra checklists dinámicos para diferentes tipos de maquinaria
- **Gestión de Usuarios y Roles** - Sistema jerárquico de permisos basado en cargos y roles de asignación
- **Inspecciones Detalladas** - Registro completo de inspecciones con seguimiento de estado
- **Sistema de Reportes** - Generación de informes y análisis de resultados
- **Observaciones y Archivos** - Adjunta comentarios y documentos a cada verificación
- **Auditoría Completa** - Trazabilidad de todas las operaciones del sistema
- **Soft Delete** - Eliminación lógica para preservar el historial

## Stack Tecnológico

### Frontend

- **Framework:** Angular 20
- **UI Components:** PrimeNG 20 + Angular Material 20
- **Estilos:** TailwindCSS
- **Validación:** Angular Forms + RxJS
- **Linting:** ESLint + Stylelint

### Backend

- **Framework:** Fastify 5.6
- **Base de Datos:** PostgreSQL
- **ORM:** Prisma 6.19
- **Autenticación:** JWT (@fastify/jwt)
- **Seguridad:** Helmet, CORS, Rate Limiting
- **Documentación:** Swagger UI
- **Validación:** JSON Schema

### DevOps

- **Package Manager:** pnpm
- **Runtime:** Node.js
- **Monorepo:** pnpm workspaces

## Instalación y Configuración

### Prerrequisitos

```bash
Node.js >= 18
pnpm >= 10
PostgreSQL >= 14
```

### Clonar el Repositorio

```bash
git clone https://github.com/Balanced-Code/mining-machinery-checklist.git
cd mining-machinery-checklist
```

### Backend

1. **Instalar dependencias:**

```bash
cd back
pnpm install
```

2. **Configurar variables de entorno:**

```bash
# Crear archivo .env
JWT_SECRET=mi-super-secreto-para-tokens
COOKIE_SECRET=mi-super-secreto-para-cookies
NODE_ENV=development
PORT=3000
HOST=127.0.0.1

DATABASE_URL="postgresql://user:password@localhost:5432/checklist_db?schema=public"
```

3. **Ejecutar migraciones:**

```bash
pnpm prisma:migrate
```

4. **Seed de datos iniciales (opcional):**

```bash
pnpm prisma:seed
```

5. **Iniciar servidor de desarrollo:**

```bash
pnpm dev
```

El servidor estará disponible en `http://localhost:3000`

### Frontend

1. **Instalar dependencias:**

```bash
cd front
npm install
```

2. **Iniciar servidor de desarrollo:**

```bash
npm start
```

La aplicación estará disponible en `http://localhost:4200`

## Scripts Disponibles

### Backend

```bash
pnpm dev              # Modo desarrollo con hot-reload
pnpm build            # Compilar TypeScript
pnpm start            # Ejecutar versión compilada
pnpm lint             # Analizar código
pnpm format           # Formatear código
pnpm prisma:studio    # Interfaz visual de la BD
pnpm db:reset         # Reiniciar base de datos
```

### Frontend

```bash
npm start             # Servidor de desarrollo
npm run build         # Build de producción
npm run lint          # Linting de código y estilos
npm run format        # Formatear código
npm test              # Ejecutar pruebas
```

## Modelo de Datos

El sistema utiliza una arquitectura relacional completa con las siguientes entidades principales:

- **Usuario & Autenticación:** Gestión de usuarios, cargos, tokens y sesiones
- **Maquinaria:** Catálogo de modelos de maquinaria
- **Templates:** Checklists personalizables con secciones ordenadas
- **Inspecciones:** Registro de inspecciones con datos de maquinaria específica
- **Resultados:** Sistema de respuestas (Sí/No/N/A) con observaciones
- **Asignaciones:** Roles y usuarios asignados a cada inspección
- **Archivos:** Gestión de documentos adjuntos con deduplicación
- **Auditoría:** Trazabilidad completa de operaciones y cambios

## Seguridad

- Autenticación JWT con tokens renovables
- Hashing de contraseñas con bcrypt
- Rate limiting para prevenir ataques de fuerza bruta
- Helmet para headers de seguridad
- CORS configurado
- Validación de esquemas con JSON Schema
- Protección contra inyección SQL (Prisma)

## Documentación API

Una vez iniciado el servidor backend, accede a la documentación interactiva en:

```
http://localhost:3000/documentation
```

## Contribución

Las contribuciones son bienvenidas. Por favor:

1. Fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit de tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## Autor

**Balanced Code**

- GitHub: [@Balanced-Code](https://github.com/Balanced-Code)
