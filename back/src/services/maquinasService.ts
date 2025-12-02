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
        _count: {
          select: {
            inspecciones: {
              where: {
                eliminadoEn: null,
              },
            },
          },
        },
      },
      orderBy: {
        nombre: 'asc',
      },
    });
  }

  async getMaquinaById(id: number) {
    return this.prisma.maquina.findFirst({
      where: {
        id,
        eliminadoEn: null,
      },
      select: {
        id: true,
        nombre: true,
        _count: {
          select: {
            inspecciones: {
              where: {
                eliminadoEn: null,
              },
            },
          },
        },
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

  async updateMaquina(id: number, nombre: string, userId: number) {
    return this.prisma.maquina.update({
      where: {
        id,
        eliminadoEn: null,
      },
      data: {
        nombre: nombre.trim(),
        actualizadoPor: userId,
        actualizadoEn: new Date(),
      },
      select: {
        id: true,
        nombre: true,
      },
    });
  }

  async deleteMaquina(id: number) {
    return this.prisma.maquina.update({
      where: {
        id,
        eliminadoEn: null,
      },
      data: {
        eliminadoEn: new Date(),
      },
      select: {
        id: true,
        nombre: true,
      },
    });
  }

  async checkMaquinaInUse(id: number): Promise<boolean> {
    const count = await this.prisma.inspeccion.count({
      where: {
        maquinaId: id,
        eliminadoEn: null,
      },
    });
    return count > 0;
  }
}
