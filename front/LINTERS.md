# Configuración de Linters y Herramientas

Este proyecto usa ESLint, Stylelint, PurgeCSS, Prettier y Autoprefixer para mantener la calidad del código.

## 🛠️ Herramientas Configuradas

### 1. **ESLint** - Linter para TypeScript/JavaScript

- **Archivo de configuración:** `eslint.config.mts`
- **Versión:** ESLint 9 (configuración flat config)
- **Plugins:** TypeScript ESLint

### 2. **Stylelint** - Linter para CSS

- **Archivo de configuración:** `stylelint.config.mjs`
- **Configuración base:** `stylelint-config-standard`

### 3. **PurgeCSS** - Elimina CSS no utilizado

- **Archivo de configuración:** `postcss.config.js`
- **Solo se ejecuta en:** Producción

### 4. **Autoprefixer** - Agrega prefijos de navegadores

- **Archivo de configuración:** `postcss.config.js`
- **Se ejecuta en:** Desarrollo y Producción

### 5. **Prettier** - Formateador de código

- **Configuración:** En `package.json`

## 📝 Scripts Disponibles

```bash
# Ejecutar todos los linters
npm run lint

# Linter para TypeScript
npm run lint:ts

# Linter para TypeScript con auto-corrección
npm run lint:ts:fix

# Linter para CSS
npm run lint:styles

# Linter para CSS con auto-corrección
npm run lint:styles:fix

# Formatear código con Prettier
npm run format
```

## ⚙️ Configuraciones Importantes

### ESLint (`eslint.config.mts`)

- ✅ Ignora archivos compilados (`dist/`, `.angular/`)
- ✅ Ignora archivos de configuración CommonJS (`*.config.js`)
- ✅ Configurado para TypeScript y Angular
- ✅ Permite variables y argumentos no usados con prefijo `_`

**Reglas personalizadas:**

- `@typescript-eslint/no-explicit-any`: warning (no error)
- `@typescript-eslint/no-unused-vars`: error (excepto con `_`)

### Stylelint (`stylelint.config.mjs`)

- ✅ Permite archivos CSS vacíos
- ✅ Reconoce `::ng-deep` de Angular
- ✅ Ignora archivos compilados

**Reglas deshabilitadas:**

- `no-empty-source`: Permite archivos vacíos
- `no-descending-specificity`: Evita conflictos con PurgeCSS
- `selector-no-qualifying-type`: Permite selectores comunes en Angular

### PostCSS (`postcss.config.js`)

**Plugins siempre activos:**

- `autoprefixer`: Agrega prefijos para navegadores modernos
  - Soporta: últimas 2 versiones, > 1% de uso, navegadores activos

**Plugins solo en producción:**

- `purgecss`: Elimina CSS no utilizado
  - Escanea: `src/**/*.html` y `src/**/*.ts`
  - Protege: Clases de Angular (`ng-*`), Material (`mat-*`), CDK (`cdk-*`)

### Prettier (`package.json`)

```json
{
  "printWidth": 100,
  "singleQuote": true,
  "overrides": [
    {
      "files": "*.html",
      "options": { "parser": "angular" }
    }
  ]
}
```

## 🚀 Flujo de Trabajo Recomendado

### Durante el Desarrollo

```bash
# Iniciar servidor de desarrollo
npm start

# En otra terminal, observar errores de lint
npm run lint
```

### Antes de Hacer Commit

```bash
# 1. Formatear código
npm run format

# 2. Corregir errores de lint automáticamente
npm run lint:ts:fix
npm run lint:styles:fix

# 3. Verificar que no hay errores
npm run lint

# 4. Ejecutar tests
npm test
```

### Build de Producción

```bash
# Build con optimizaciones (incluye PurgeCSS y Autoprefixer)
npm run build

# El CSS resultante estará optimizado y sin clases no utilizadas
```

## 🔧 Personalización

### Agregar clases protegidas en PurgeCSS

Si tienes clases dinámicas que se eliminan incorrectamente, agrégalas al `safelist` en `postcss.config.js`:

```javascript
safelist: {
  standard: ['mi-clase-dinamica'],  // Clases exactas
  greedy: [/^custom-prefix-/]       // Patrones regex
}
```

### Deshabilitar reglas de ESLint

En archivos específicos:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = {};
```

En todo el archivo:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
```

### Deshabilitar reglas de Stylelint

```css
/* stylelint-disable selector-class-pattern */
.MiClase-NoConvencional {
  color: red;
}
/* stylelint-enable selector-class-pattern */
```

## ⚠️ Evitar Conflictos

### ESLint y Prettier

- Prettier solo formatea, no marca errores
- ESLint revisa la lógica y buenas prácticas
- No hay conflicto entre ellos

### Stylelint y PurgeCSS

- Stylelint revisa la sintaxis CSS
- PurgeCSS elimina CSS no usado solo en producción
- El `safelist` protege clases de Angular

### PostCSS y Angular

- Angular ejecuta PostCSS automáticamente al detectar `postcss.config.js`
- No requiere configuración adicional en `angular.json`

## 📚 Recursos

- [ESLint](https://eslint.org/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [Stylelint](https://stylelint.io/)
- [PurgeCSS](https://purgecss.com/)
- [Autoprefixer](https://github.com/postcss/autoprefixer)
- [Prettier](https://prettier.io/)
