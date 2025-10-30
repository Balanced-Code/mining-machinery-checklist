/**
 * Usuario autenticado con información de cargo
 * Usado en el contexto de autenticación (JWT, sesiones, etc.)
 */
export interface AuthenticatedUser {
  id: number;
  nombre: string;
  correo: string;
  cargoId: number;
  cargoNombre: string;
  cargoNivel: number;
}

/**
 * Payload del JWT (información que se almacena en el token)
 */
export interface JwtPayload {
  userId: number;
  nombre: string;
  correo: string;
  cargoId: number;
  cargoNombre: string;
  jti: string; // JWT ID único
  iat: number; // Issued at
  exp: number; // Expiration
}

/**
 * Credenciales de login
 */
export interface LoginRequest {
  correo: string;
  contrasena: string;
}

/**
 * Respuesta del login exitoso
 */
export interface LoginResponse {
  success: boolean;
  message: string;
  user: {
    id: number;
    nombre: string;
    correo: string;
    cargo: {
      id: number;
      nombre: string;
      nivel: number;
    };
  };
}

/**
 * Respuesta del logout
 */
export interface LogoutResponse {
  success: boolean;
  message: string;
}

/**
 * Datos para crear un token JWT
 */
export interface TokenData {
  userId: number;
  nombre: string;
  correo: string;
  cargoId: number;
  cargoNombre: string;
  jti: string;
}

/**
 * Configuración de jerarquía de cargos
 */
export interface CargosConfigResponse {
  hierarchy: Record<string, number>;
}
