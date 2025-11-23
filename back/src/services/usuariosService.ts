import type {
  CargosDetails,
  CreateUserData,
  NewUserDetails,
  UpdatePassUserData,
  UpdateUserData,
  UsersDetails,
} from '@/models/user';
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

  /**
   * Obtener todos los cargos disponibles
   */
  async getAllCargos(): Promise<CargosDetails[]> {
    return this.prisma.cargo.findMany({
      orderBy: {
        nivel: 'asc',
      },
    });
  }

  /**
   * Obtener un usuario por ID
   * @param id ID del usuario
   * @returns Usuario encontrado
   */
  getUsuarioById(id: number): Promise<UsersDetails | null> {
    return this.prisma.usuario.findUnique({
      where: {
        id,
      },
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
    });
  }

  /**
   * Verificar si un usuario existe por correo
   * @param correo Correo del usuario
   * @returns Usuario encontrado
   */
  checkUser(correo: string): Promise<UsersDetails | null> {
    return this.prisma.usuario.findUnique({
      where: {
        correo,
      },
    });
  }

  checkRole(cargoId: number): Promise<CargosDetails | null> {
    return this.prisma.cargo.findUnique({
      where: {
        id: cargoId,
      },
    }) as Promise<CargosDetails | null>;
  }

  createUsuario(userData: CreateUserData): Promise<NewUserDetails> {
    return this.prisma.usuario.create({
      data: { ...userData, creadoEn: new Date() },
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
    });
  }

  resetUsuario(id: number, contrasena: string): Promise<UpdatePassUserData> {
    return this.prisma.usuario.update({
      where: { id },
      data: { contrasena },
      select: {
        id: true,
        nombre: true,
        correo: true,
        cargo: {
          select: {
            nombre: true,
          },
        },
      },
    });
  }

  updateUsuario(id: number, userData: UpdateUserData): Promise<UsersDetails> {
    return this.prisma.usuario.update({
      where: { id },
      data: userData,
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
    });
  }

  /**
   * Obtener un usuario activo
   * @param id ID del usuario
   * @returns Usuario activo
   */
  getActiveUsuario(id: number): Promise<UsersDetails | null> {
    return this.prisma.usuario.findFirst({
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
        eliminadoEn: true,
      },
    });
  }

  deleteUsuario(id: number): Promise<void> {
    return this.prisma.usuario
      .update({
        where: { id },
        data: { eliminadoEn: new Date() },
        select: { id: true },
      })
      .then(() => undefined);
  }

  getDeleteUsuario(id: number): Promise<UsersDetails | null> {
    return this.prisma.usuario.findFirst({
      where: { id, eliminadoEn: { not: null } },
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
    });
  }

  reactiveUsuario(id: number): Promise<void> {
    return this.prisma.usuario
      .update({
        where: { id },
        data: { eliminadoEn: null, actualizadoEn: new Date() },
      })
      .then(() => undefined);
  }
}
