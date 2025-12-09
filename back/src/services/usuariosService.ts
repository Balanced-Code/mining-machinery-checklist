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
   * Obtener usuarios filtrados por nombre de cargo
   * @param cargoNombre Nombre del cargo (ej: "Inspector", "Supervisor", "Técnico")
   * @returns Objeto con lista de usuarios y total de registros
   */
  async getUsersByCargoNombre(
    cargoNombre: string
  ): Promise<{ users: UsersDetails[]; total: number }> {
    const [users, total] = await this.prisma.$transaction([
      this.prisma.usuario.findMany({
        where: {
          eliminadoEn: null,
          cargo: {
            nombre: {
              equals: cargoNombre,
              mode: 'insensitive',
            },
          },
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
        orderBy: {
          nombre: 'asc',
        },
      }),
      this.prisma.usuario.count({
        where: {
          eliminadoEn: null,
          cargo: {
            nombre: {
              equals: cargoNombre,
              mode: 'insensitive',
            },
          },
        },
      }),
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

  /**
   * Verificar si un cargo existe
   * @param cargoId ID del cargo
   * @returns Cargo encontrado
   */
  checkRole(cargoId: number): Promise<CargosDetails | null> {
    return this.prisma.cargo.findUnique({
      where: {
        id: cargoId,
      },
    }) as Promise<CargosDetails | null>;
  }

  /**
   * Crear un nuevo usuario
   * @param userData Datos del usuario a crear
   * @returns Usuario creado
   */
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

  /**
   * Resetear la contraseña de un usuario
   * @param id ID del usuario
   * @param contrasena Nueva contraseña
   * @returns Usuario actualizado
   */
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

  /**
   * Actualizar un usuario
   * @param id ID del usuario
   * @param userData Datos del usuario a actualizar
   * @returns Usuario actualizado
   */
  updateUsuario(id: number, userData: UpdateUserData): Promise<UsersDetails> {
    return this.prisma.usuario.update({
      where: { id },
      data: { ...userData, actualizadoEn: new Date() },
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

  /**
   * Eliminar un usuario
   * @param id ID del usuario
   * @returns void
   */
  deleteUsuario(id: number): Promise<void> {
    return this.prisma.usuario
      .update({
        where: { id },
        data: { eliminadoEn: new Date() },
        select: { id: true },
      })
      .then(() => undefined);
  }

  /**
   * Obtener un usuario eliminado
   * @param id ID del usuario
   * @returns Usuario eliminado
   */
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

  /**
   * Reactivar un usuario
   * @param id ID del usuario
   * @returns void
   */
  reactiveUsuario(id: number): Promise<void> {
    return this.prisma.usuario
      .update({
        where: { id },
        data: { eliminadoEn: null, actualizadoEn: new Date() },
      })
      .then(() => undefined);
  }
}
