import type { PrismaClient } from '@/generated/prisma';
import type {
  NewSeccionData,
  NewTemplateData,
  TemplateDetails,
  UpdateSeccionData,
} from '@/models/template';

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

  async createTemplate(user: number, nombre: string): Promise<NewTemplateData> {
    return this.prisma.template.create({
      data: { nombre, creadoPor: user, creadoEn: new Date() },
      select: {
        id: true,
        nombre: true,
      },
    });
  }

  /**
   * Crea una nueva seccion del template
   * @param user ID del usuario que crea la seccion
   * @param template_id ID del template al que pertenece la seccion
   * @param nombre Nombre de la seccion
   * @param orden Orden de la seccion
   * @returns Seccion creada
   */
  async createSeccion(
    user: number,
    template_id: number,
    nombre: string,
    orden: number
  ): Promise<NewSeccionData> {
    const existingSeccion = await this.prisma.templateSeccion.findFirst({
      where: {
        templateId: template_id,
        orden: orden,
        eliminadoEn: null,
      },
    });

    if (existingSeccion) {
      throw new Error(
        `Ya existe una sección con orden ${orden} en este template`
      );
    }

    return this.prisma.templateSeccion.create({
      data: {
        nombre,
        templateId: template_id,
        orden,
        creadoPor: user,
        creadoEn: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        templateId: true,
        orden: true,
      },
    });
  }

  async getTemplateById(id: number): Promise<NewTemplateData | null> {
    return this.prisma.template.findUnique({
      where: {
        id,
        eliminadoEn: null,
      },
      select: {
        id: true,
        nombre: true,
      },
    });
  }

  /**
   * Actualizar un template existente
   * @param user ID del usuario que actualiza
   * @param id ID del template
   * @param nombre Nuevo nombre del template
   * @throws Error si el template está siendo usado en inspecciones
   */
  async updateTemplate(
    user: number,
    id: number,
    nombre: string
  ): Promise<NewTemplateData> {
    // Verificar si el template está siendo usado en alguna inspección
    const inUse = await this.prisma.eleccionTemplate.findFirst({
      where: { templateId: id },
    });

    if (inUse) {
      throw new Error(
        'No se puede modificar un template que está siendo usado en inspecciones'
      );
    }

    return this.prisma.template.update({
      where: { id, eliminadoEn: null },
      data: { nombre, actualizadoPor: user, actualizadoEn: new Date() },
      select: {
        id: true,
        nombre: true,
      },
    });
  }

  async getSeccionById(id: number): Promise<NewSeccionData | null> {
    return this.prisma.templateSeccion.findUnique({
      where: {
        id,
        eliminadoEn: null,
      },
      select: {
        id: true,
        nombre: true,
        templateId: true,
        orden: true,
      },
    });
  }

  /**
   * Actualizar una sección existente
   * @param user ID del usuario que actualiza
   * @param id ID de la sección
   * @param seccionData Datos a actualizar (nombre y/o orden)
   * @throws Error si la sección está siendo usada en inspecciones
   * @throws Error si el nuevo orden ya está ocupado
   */
  async updateSeccion(
    user: number,
    id: number,
    seccionData: UpdateSeccionData
  ): Promise<NewSeccionData> {
    // Verificar si la sección está siendo usada en inspecciones
    const inUse = await this.prisma.eleccionRespuesta.findFirst({
      where: { templateSeccionId: id },
    });

    if (inUse) {
      throw new Error(
        'No se puede modificar una sección que está siendo usada en inspecciones'
      );
    }

    // Validar orden duplicado si se está cambiando
    if (seccionData.orden !== undefined) {
      const seccion = await this.prisma.templateSeccion.findUnique({
        where: { id },
      });

      if (seccion && seccion.orden !== seccionData.orden) {
        const existingSeccion = await this.prisma.templateSeccion.findFirst({
          where: {
            templateId: seccion.templateId,
            orden: seccionData.orden,
            eliminadoEn: null,
            id: { not: id },
          },
        });

        if (existingSeccion) {
          throw new Error(
            `Ya existe una sección con orden ${seccionData.orden} en este template`
          );
        }
      }
    }

    return this.prisma.templateSeccion.update({
      where: { id, eliminadoEn: null },
      data: { ...seccionData, actualizadoPor: user, actualizadoEn: new Date() },
      select: {
        id: true,
        nombre: true,
        templateId: true,
        orden: true,
      },
    });
  }

  /**
   * Eliminar un template (hard o soft delete según uso)
   * @param id ID del template a eliminar
   * @param userId ID del usuario que elimina (para audit trail)
   */
  async deleteTemplate(id: number, userId: number): Promise<void> {
    // Verificar si el template está siendo usado en inspecciones
    const inUse = await this.prisma.eleccionTemplate.findFirst({
      where: { templateId: id },
    });

    if (inUse) {
      // Soft delete - Template usado en inspecciones
      await this.prisma.template.update({
        where: { id },
        data: {
          eliminadoEn: new Date(),
          eliminadoPor: userId,
        },
      });
    } else {
      // Hard delete - Template no usado
      // Primero eliminar las secciones asociadas
      await this.prisma.templateSeccion.deleteMany({
        where: { templateId: id },
      });

      // Luego eliminar el template
      await this.prisma.template.delete({
        where: { id },
      });
    }
  }

  /**
   * Eliminar una sección (hard o soft delete según uso)
   * @param id ID de la sección a eliminar
   * @param userId ID del usuario que elimina (para audit trail)
   */
  async deleteSeccion(id: number, userId: number): Promise<void> {
    // Verificar si la sección está siendo usada en inspecciones
    const inUse = await this.prisma.eleccionRespuesta.findFirst({
      where: { templateSeccionId: id },
    });

    if (inUse) {
      // Soft delete - Sección usada en inspecciones
      await this.prisma.templateSeccion.update({
        where: { id },
        data: {
          eliminadoEn: new Date(),
          eliminadoPor: userId,
        },
      });
    } else {
      // Hard delete - Sección no usada
      await this.prisma.templateSeccion.delete({
        where: { id },
      });
    }
  }
}
