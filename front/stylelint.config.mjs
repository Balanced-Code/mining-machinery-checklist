/** @type {import("stylelint").Config} */
export default {
  extends: ['stylelint-config-standard'],
  rules: {
    // Permitir archivos CSS vacíos (común en desarrollo)
    'no-empty-source': null,
    // Permitir selectores de Angular como ::ng-deep
    'selector-pseudo-element-no-unknown': [
      true,
      {
        ignorePseudoElements: ['ng-deep'],
      },
    ],
    // Permitir nombres de propiedades personalizadas de Angular
    'property-no-unknown': [
      true,
      {
        ignoreProperties: [],
      },
    ],
    // Permitir funciones de CSS modernas
    'function-no-unknown': [
      true,
      {
        ignoreFunctions: [],
      },
    ],
    // Deshabilitar reglas que pueden entrar en conflicto con PostCSS/PurgeCSS
    'no-descending-specificity': null,
    // Permitir selectores de tipo con clases (común en Angular)
    'selector-no-qualifying-type': null,
    // Configurar orden de propiedades (opcional, puedes deshabilitarlo)
    'declaration-block-no-redundant-longhand-properties': null,
  },
  ignoreFiles: ['dist/**', 'node_modules/**', '.angular/**', 'coverage/**'],
};
