import type { PrismaClient } from '@/generated/prisma';
import type { UserAuth } from '@/models/user';

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Obtiene un usuario por ID, solo campos públicos (sin password)
   * Útil para usar en la autenticación
   * @returns El usuario encontrado o null si no se encuentra
   */
  getUserByIdAuth(id: number): Promise<UserAuth | null> {
    return this.prisma.usuario.findUnique({
      where: { id, eliminadoEn: null },
      select: {
        id: true,
        nombre: true,
        correo: true,
        cargo: {
          select: {
            id: true,
            nombre: true,
            nivel: true,
          },
        },
      },
    }) as Promise<UserAuth | null>;
  }
}
