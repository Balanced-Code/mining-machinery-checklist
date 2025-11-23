/**
 * Usuario autenticado con su cargo (rol organizacional)
 */
export interface User {
  id: number;
  nombre: string;
  correo: string;
  cargo: Cargo;
  eliminadoEn: string | null;
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

/**
 * Datos para crear un nuevo usuario
 */
export interface CreateUsuarioRequest {
  nombre: string;
  correo: string;
  cargoId: number;
}

/**
 * Datos para actualizar un usuario existente
 */
export interface UpdateUsuarioRequest {
  nombre?: string;
  cargoId?: number;
}

/**
 * Respuesta al crear/actualizar usuario
 */
export interface UsuarioResponse {
  success: boolean;
  message: string;
  user?: User;
}

/**
 * Respuesta de listado de usuarios
 */
export interface UsuariosListResponse {
  users: User[];
  total: number;
}

/**
 * Modo del diálogo (crear o editar)
 */
export type UserDialogMode = 'create' | 'edit';

/**
 * Configuración del diálogo de usuario
 */
export interface UserDialogData {
  mode: UserDialogMode;
  user?: User;
}

/**
 * Respuesta al restablecer contraseña
 */
export interface ResetPasswordResponse {
  success: boolean;
  message: string;
  newPassword?: string;
}
