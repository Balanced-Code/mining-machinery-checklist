/* eslint-disable */
const autoprefixer = require('autoprefixer');
const purgecss = require('@fullhuman/postcss-purgecss');

module.exports = {
  plugins: [
    // Autoprefixer siempre activo (agrega prefijos de navegadores)
    autoprefixer({
      overrideBrowserslist: ['last 2 versions', '> 1%', 'not dead'],
    }),
    // Solo ejecuta PurgeCSS en producción
    ...(process.env['NODE_ENV'] === 'production'
      ? [
          purgecss({
            content: ['./src/**/*.html', './src/**/*.ts'],
            // Extractor personalizado para Angular y clases dinámicas
            defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
            // Safelist para clases que no deben ser eliminadas
            safelist: {
              // Clases estándar que siempre mantener
              standard: [],
              // Clases con selectores profundos (::ng-deep, etc.)
              deep: [],
              // Patrones regex para mantener clases dinámicas
              greedy: [
                /^ng-/, // Clases de Angular
                /^mat-/, // Angular Material (si lo usas)
                /^cdk-/, // Angular CDK
                /:\w+/, // Pseudo-clases
              ],
            },
          }),
        ]
      : []),
  ],
};
