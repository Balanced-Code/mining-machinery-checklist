/**
 * Usuario autenticado con su cargo (rol organizacional)
 */
export interface User {
  id: number;
  nombre: string;
  correo: string;
  cargo: Cargo;
}

/**
 * Cargo del usuario (rol organizacional con jerarquía)
 * Ejemplos: Operador, Supervisor, Gerente, Administrador
 */
export interface Cargo {
  id: number;
  nombre: string;
  nivel: number; // Jerarquía: mayor nivel = más permisos
}

/**
 * Configuración de cargos desde el backend
 */
export interface CargosConfig {
  hierarchy: Record<string, number>; // { "operador": 1, "supervisor": 2, ... }
}

/**
 * Credenciales de login
 */
export interface LoginRequest {
  correo: string;
  contrasena: string;
}

/**
 * Respuesta del login
 */
export interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
}

/**
 * Request para cambio de contraseña
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Respuesta del cambio de contraseña
 */
export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}
