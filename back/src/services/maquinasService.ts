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
}
