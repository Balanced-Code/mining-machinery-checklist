import type { PrismaClient, UsuarioSistema } from '../generated/prisma';

const PUBLIC_USER_SELECT_AUTH = {
  id: true,
  username: true,
  email: true,
  rol: true,
} as const;

type UserWithoutSensitive = Omit<UsuarioSistema, 'password' | 'deletedAt'>;
type UserWithActiveStatus = UserWithoutSensitive & { isActive: boolean };

export class UserService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Obtiene un usuario por ID, solo campos públicos (sin id, password, timestamps)
   * Útil para usar en la autenticación en el frontend
   */
  async getUserByIdPublic(id: number) {
    return this.prisma.usuarioSistema.findUnique({
      where: { id },
      select: PUBLIC_USER_SELECT_AUTH,
    });
  }

  /**
   * Obtiene un usuario por ID, excluyendo eliminados lógicamente
   */
  async getUserById(id: number): Promise<UserWithoutSensitive | null> {
    return this.prisma.usuarioSistema.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        username: true,
        email: true,
        rol: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
