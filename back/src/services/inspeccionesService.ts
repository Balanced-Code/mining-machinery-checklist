import type { PrismaClient, Prisma } from '@prisma/client';
import type {
  InspeccionData,
  CreateInspeccionCompleteData,
  UpdateInspeccionData,
} from '@/models/inspeccion';

export class InspeccionesService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Obtener todas las inspecciones (no eliminadas)
   * Incluye: maquina, creador (inspector)
   */
  async getAllInspecciones(): Promise<InspeccionData[]> {
    const inspecciones = await this.prisma.inspeccion.findMany({
      where: {
        eliminadoEn: null,
      },
      include: {
        maquina: {
          select: {
            id: true,
            nombre: true,
          },
        },
        creador: {
          select: {
            id: true,
            nombre: true,
            correo: true,
          },
        },
      },
      orderBy: {
        fechaInicio: 'desc',
      },
    });

    return inspecciones as unknown as InspeccionData[];
  }

  /**
   * Obtener una inspección por ID
   */
  async getInspeccionById(id: bigint): Promise<InspeccionData | null> {
    const inspeccion = await this.prisma.inspeccion.findUnique({
      where: { id },
      include: {
        maquina: {
          select: {
            id: true,
            nombre: true,
          },
        },
        creador: {
          select: {
            id: true,
            nombre: true,
            correo: true,
          },
        },
        asignaciones: {
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                correo: true,
              },
            },
            rolAsignacion: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
      },
    });

    return inspeccion as unknown as InspeccionData | null;
  }

  /**
   * Crear una nueva inspección con checklists (transaccional)
   */
  async createInspeccion(
    data: CreateInspeccionCompleteData,
    userId: number
  ): Promise<InspeccionData> {
    // Validar que la máquina existe
    const maquina = await this.prisma.maquina.findUnique({
      where: { id: data.maquinaId },
    });

    if (!maquina) {
      throw new Error(`Máquina con ID ${data.maquinaId} no encontrada`);
    }

    // Validar que los templates existen
    const templates = await this.prisma.template.findMany({
      where: {
        id: { in: data.templateIds },
        eliminadoEn: null,
      },
    });

    if (templates.length !== data.templateIds.length) {
      throw new Error('Uno o más templates no fueron encontrados');
    }

    // Crear inspección y elecciones de template en una transacción
    const inspeccion = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Crear la inspección
        const nuevaInspeccion = await tx.inspeccion.create({
          data: {
            fechaInicio: data.fechaInicio,
            fechaFinalizacion: data.fechaFinalizacion ?? null,
            maquinaId: data.maquinaId,
            numSerie: data.numSerie,
            nSerieMotor: data.nSerieMotor ?? null,
            cabinado: data.cabinado ?? null,
            horometro: data.horometro ?? null,
            creadoPor: userId,
          },
          include: {
            maquina: {
              select: {
                id: true,
                nombre: true,
              },
            },
            creador: {
              select: {
                id: true,
                nombre: true,
                correo: true,
              },
            },
          },
        });

        // Crear elecciones de template
        await tx.eleccionTemplate.createMany({
          data: data.templateIds.map(templateId => ({
            templateId,
            inspeccionId: nuevaInspeccion.id,
            creadoPor: userId,
          })),
        });

        return nuevaInspeccion;
      }
    );

    return inspeccion as unknown as InspeccionData;
  }

  /**
   * Actualizar una inspección existente
   */
  async updateInspeccion(
    id: bigint,
    data: UpdateInspeccionData,
    userId: number
  ): Promise<InspeccionData> {
    const inspeccion = await this.prisma.inspeccion.update({
      where: { id },
      data: {
        ...data,
        actualizadoPor: userId,
        actualizadoEn: new Date(),
      },
      include: {
        maquina: {
          select: {
            id: true,
            nombre: true,
          },
        },
        creador: {
          select: {
            id: true,
            nombre: true,
            correo: true,
          },
        },
      },
    });

    return inspeccion as unknown as InspeccionData;
  }

  /**
   * Eliminar una inspección (soft delete)
   */
  async deleteInspeccion(id: bigint, userId: number): Promise<void> {
    await this.prisma.inspeccion.update({
      where: { id },
      data: {
        eliminadoEn: new Date(),
        eliminadoPor: userId,
      },
    });
  }
}
