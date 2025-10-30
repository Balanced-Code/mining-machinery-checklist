import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Archivos ignorados globalmente
  {
    ignores: [
      'src/generated/**/*', // Archivos generados por Prisma
      'dist/**/*', // Archivos compilados
      'node_modules/**/*', // node_modules
      'coverage/**/*', // Cobertura de tests
      '.pnpm-store/**/*', // Cache de pnpm
    ],
  },

  // Configuración base de JavaScript
  js.configs.recommended,

  // Configuración recomendada de TypeScript
  ...tseslint.configs.recommended,

  // Configuración específica del proyecto
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // Reglas específicas para Fastify
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Mejores prácticas para async/await (común en Fastify)
      // require-await desactivado porque FastifyPluginAsync requiere async aunque no use await directamente
      'require-await': 'off',
      'no-return-await': 'error',
    },
  },

  // Desactivar reglas que conflictan con Prettier (debe ir al final)
  prettierConfig
);
