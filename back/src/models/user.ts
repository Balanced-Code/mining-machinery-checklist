import type { Cargo, Usuario } from '../generated/prisma';

/**
 * Usuario público (sin datos sensibles)
 * Para respuestas de API
 */
export interface UserPublic {
  id: number;
  nombre: string;
  correo: string;
  cargo: {
    id: number;
    nombre: string;
    nivel: number;
  };
  creadoEn: Date;
}

/**
 * Datos para crear un usuario
 */
export interface CreateUserData {
  nombre: string;
  correo: string;
  contrasena: string;
  cargoId: number;
}

/**
 * Datos para actualizar un usuario
 */
export interface UpdateUserData {
  nombre?: string;
  correo?: string;
  contrasena?: string;
  cargoId?: number;
}

/**
 * Usuario sin campos sensibles (usando Omit de Prisma)
 */
export type UserWithoutSensitive = Omit<Usuario, 'contrasena' | 'eliminadoEn'>;

/**
 * Usuario con cargo incluido
 */
export type UserWithCargo = Usuario & {
  cargo: Cargo;
};
