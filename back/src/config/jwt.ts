// Configuración centralizada de JWT y cookies de autenticación
// Esto asegura consistencia en toda la aplicación

export const JWT_CONFIG = {
  // Duración del token JWT
  EXPIRES_IN: '24h',

  // Algoritmo de firma
  ALGORITHM: 'HS256' as const,

  // Nombre de la cookie
  COOKIE_NAME: 'authToken',

  // Duración de la cookie en milisegundos (debe coincidir con JWT)
  COOKIE_MAX_AGE: 24 * 60 * 60 * 1000, // 24 horas
} as const;

// Función helper para detectar si estamos en producción
export function isProductionEnvironment(nodeEnv: string): boolean {
  return nodeEnv === 'production';
}

// Función helper para generar opciones de cookies basadas en el entorno
export function getCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    path: '/',
  };
}

// Opciones para setCookie (incluye maxAge) - versión con entorno
export function getSetCookieOptions(nodeEnv: string) {
  return {
    ...getCookieOptions(isProductionEnvironment(nodeEnv)),
    maxAge: JWT_CONFIG.COOKIE_MAX_AGE,
  };
}

// Opciones para clearCookie (sin maxAge) - versión con entorno
export function getClearCookieOptions(nodeEnv: string) {
  return getCookieOptions(isProductionEnvironment(nodeEnv));
}

// Función helper para convertir duración string a milisegundos
export function parseJwtDurationToMs(duration: string): number {
  const unit = duration.slice(-1);
  const value = parseInt(duration.slice(0, -1));

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Formato de duración JWT inválido: ${duration}`);
  }
}

// Verificar que la duración de JWT y cookie coinciden
if (parseJwtDurationToMs(JWT_CONFIG.EXPIRES_IN) !== JWT_CONFIG.COOKIE_MAX_AGE) {
  throw new Error('La duración del JWT y la cookie deben coincidir');
}
