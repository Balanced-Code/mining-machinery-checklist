import type { Cargo, Usuario } from '@/generated/prisma';

/**
 * Detalles de Usuarios (listado/no)
 */
export interface UsersDetails {
  id: number;
  nombre: string;
  correo: string;
  cargo: {
    id: number;
    nombre: string;
    nivel: number;
  };
  eliminadoEn: Date | null;
}

export interface NewUserDetails {
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
 * Datos para crear un usuario
 */
export interface CreateUserData {
  nombre: string;
  correo: string;
  contrasena: string;
  cargoId: number;
}

export interface UpdateUserData {
  nombre?: string;
  cargoId?: number;
}

/**
 * Datos para actualizar un usuario
 */
export interface UpdatePassUserData {
  id: number;
  nombre: string;
  correo: string;
  cargo: {
    nombre: string;
  };
}

export interface UserAuth {
  id: number;
  nombre: string;
  correo: string;
  cargoId: number;
  cargo: {
    id: number;
    nombre: string;
    nivel: number;
  };
}

export interface CargosDetails {
  id: number;
  nombre: string;
  nivel: number;
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
