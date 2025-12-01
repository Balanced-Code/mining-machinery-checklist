import type { PrismaClient } from '@/generated/prisma';

export class MaquinasService {
  constructor(private prisma: PrismaClient) {}

  async getAllMaquinas() {
    return this.prisma.maquina.findMany({
      where: {
        eliminadoEn: null,
      },
      select: {
        id: true,
        nombre: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    });
  }

  async getMaquinaByNombre(nombre: string) {
    return this.prisma.maquina.findFirst({
      where: {
        nombre: {
          equals: nombre,
          mode: 'insensitive', // Búsqueda case-insensitive
        },
        eliminadoEn: null,
      },
      select: {
        id: true,
        nombre: true,
      },
    });
  }

  async createMaquina(nombre: string, userId: number) {
    return this.prisma.maquina.create({
      data: {
        nombre: nombre.trim(),
        creadoPor: userId,
      },
      select: {
        id: true,
        nombre: true,
      },
    });
  }
}
