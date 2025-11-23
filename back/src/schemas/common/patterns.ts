/**
 * Patrones comunes para validación de esquemas
 */

/**
 * Patrón para validar correos corporativos de Normet
 */
export const CORREO_EMPRESA_PATTERN = '^[a-zA-Z0-9._%+-]+@normet\\.com$';

/**
 * Patrón para validar nombres (solo letras)
 */
export const NOMBRE_PATTERN = '^[A-Za-z]+$';

/**
 * Patrón para contraseñas seguras
 * Debe contener al menos: una mayúscula, una minúscula, un número y un símbolo especial
 */
export const PASSWORD_SEGURO_PATTERN =
  '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=[\\]{};:\'"\\\\|,.<>/?]).+$';
