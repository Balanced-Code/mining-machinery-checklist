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

  /**
   * Obtiene la lista de cargos activos para configuración
   * @returns Lista de cargos con nombre y nivel
   */
  getCargosHierarchy() {
    return this.prisma.cargo.findMany({
      where: {
        eliminadoEn: null, // Solo cargos activos
      },
      select: {
        nombre: true,
        nivel: true,
      },
      orderBy: {
        nivel: 'asc', // Ordenar por nivel ascendente
      },
    });
  }

  loginUser(email: string) {
    return this.prisma.usuario.findUnique({
      where: {
        correo: email.toLowerCase().trim(),
        eliminadoEn: null, // Solo usuarios activos
      },
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

  changePassword(userId: number) {
    return this.prisma.usuario.findUnique({
      where: {
        id: userId,
        eliminadoEn: null,
      },
      select: {
        id: true,
        contrasena: true,
      },
    });
  }

  updatePassword(userId: number, newPassword: string) {
    return this.prisma.usuario.update({
      where: { id: userId },
      data: { contrasena: newPassword },
    });
  }
}
