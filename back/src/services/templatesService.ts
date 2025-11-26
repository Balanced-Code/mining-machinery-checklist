import type { PrismaClient } from '@/generated/prisma';
import type { TemplateDetails } from '@/models/template';

export class TemplatesService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Obtener todos los templates de checklist
   * @returns Objeto con lista de templates y total de ellos
   */
  async getAllTemplates(): Promise<{
    temps: TemplateDetails[];
    total: number;
  }> {
    const [temps, total] = await this.prisma.$transaction([
      this.prisma.template.findMany({
        where: {
          eliminadoEn: null,
        },
        select: {
          id: true,
          nombre: true,
          secciones: {
            where: {
              eliminadoEn: null,
            },
            select: {
              id: true,
              nombre: true,
              orden: true,
            },
            orderBy: {
              orden: 'asc',
            },
          },
        },
        orderBy: {
          id: 'asc',
        },
      }),
      this.prisma.template.count({
        where: {
          eliminadoEn: null,
        },
      }),
    ]);

    return { temps, total };
  }
}
