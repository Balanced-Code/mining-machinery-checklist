/**
 * Modelo de Usuario para la tabla de gestión
 */
export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  cargo: {
    id: number;
    nombre: string;
    nivel: number;
  };
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
  correo?: string;
  cargoId?: number;
}

/**
 * Respuesta al crear/actualizar usuario
 */
export interface UsuarioResponse {
  success: boolean;
  message: string;
  user?: Usuario;
}

/**
 * Respuesta de listado de usuarios
 */
export interface UsuariosListResponse {
  users: Usuario[];
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
  user?: Usuario;
}

/**
 * Respuesta al restablecer contraseña
 */
export interface ResetPasswordResponse {
  success: boolean;
  message: string;
  newPassword?: string;
}
