/**
 * Patrones comunes para validación de esquemas
 */

/**
 * Patrón para validar correos corporativos de Normet
 */
export const CORREO_EMPRESA_PATTERN = '^[a-zA-Z0-9._%+-]+@normet\\.com$';

/**
 * Patrón para validar nombres (letras, espacios, acentos, ñ)
 * Permite nombres completos como "Juan Pérez" o "María José García"
 */
export const NOMBRE_PATTERN = '^[A-Za-zÀ-ÿ\\u00f1\\u00d1\\s]+$';

/**
 * Patrón para contraseñas seguras
 * Debe contener al menos: una mayúscula, una minúscula, un número y un símbolo especial
 */
export const PASSWORD_SEGURO_PATTERN =
  '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=[\\]{};:\'"\\\\|,.<>/?]).+$';
