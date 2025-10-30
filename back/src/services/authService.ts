import type { PrismaClient } from '../generated/prisma';
import type { UserPublic, UserWithoutSensitive } from '../models/user';

const PUBLIC_USER_SELECT_AUTH = {
  id: true,
  nombre: true,
  correo: true,
  cargoId: true,
  cargo: {
    select: {
      id: true,
      nombre: true,
      nivel: true,
    },
  },
  creadoEn: true,
} as const;

export class UserService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Obtiene un usuario por ID, solo campos públicos (sin password)
   * Útil para usar en la autenticación
   */
  getUserByIdPublic(id: number): Promise<UserPublic | null> {
    return this.prisma.usuario.findUnique({
      where: { id, eliminadoEn: null },
      select: PUBLIC_USER_SELECT_AUTH,
    }) as Promise<UserPublic | null>;
  }

  /**
   * Obtiene un usuario por ID, excluyendo eliminados lógicamente
   */
  getUserById(id: number): Promise<UserWithoutSensitive | null> {
    return this.prisma.usuario.findUnique({
      where: { id, eliminadoEn: null },
      select: {
        id: true,
        nombre: true,
        correo: true,
        cargoId: true,
        creadoEn: true,
        actualizadoEn: true,
      },
    }) as Promise<UserWithoutSensitive | null>;
  }

  /**
   * Obtiene un usuario por correo, excluyendo eliminados lógicamente
   */
  getUserByEmail(correo: string) {
    return this.prisma.usuario.findUnique({
      where: { correo, eliminadoEn: null },
      include: {
        cargo: {
          select: {
            id: true,
            nombre: true,
            nivel: true,
          },
        },
      },
    });
  }
}
