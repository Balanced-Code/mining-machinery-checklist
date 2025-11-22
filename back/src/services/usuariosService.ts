import type { UsersDetails } from '@/models/user';
import type { PrismaClient } from '@prisma/client';

export class UsuariosService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Obtener todos los usuarios del sistema (activos y desactivados)
   * @returns Objeto con lista de usuarios y total de registros
   */
  async getAllUsers(): Promise<{ users: UsersDetails[]; total: number }> {
    const [users, total] = await this.prisma.$transaction([
      this.prisma.usuario.findMany({
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
          eliminadoEn: true,
        },
        orderBy: {
          id: 'asc',
        },
      }),
      this.prisma.usuario.count(),
    ]);

    return { users, total };
  }
}
