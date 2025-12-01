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
    if (!data.maquinaId) {
      throw new Error('El ID de la máquina es obligatorio');
    }

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

  /**
   * Guardar o actualizar respuesta a un ítem del checklist
   */
  async guardarRespuesta(data: {
    inspeccionId: bigint;
    templateId: number;
    templateSeccionId: number;
    cumple: boolean | null;
    observacion?:
      | {
          id?: number;
          descripcion: string;
        }
      | undefined;
    userId: number;
  }) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Verificar que la inspección existe
      const inspeccion = await tx.inspeccion.findUnique({
        where: { id: data.inspeccionId, eliminadoEn: null },
      });

      if (!inspeccion) {
        throw new Error('Inspección no encontrada');
      }

      // 2. Obtener o crear EleccionTemplate
      let eleccionTemplate = await tx.eleccionTemplate.findFirst({
        where: {
          inspeccionId: data.inspeccionId,
          templateId: data.templateId,
          eliminadoEn: null,
        },
      });

      if (!eleccionTemplate) {
        // Crear elección de template si no existe
        eleccionTemplate = await tx.eleccionTemplate.create({
          data: {
            inspeccionId: data.inspeccionId,
            templateId: data.templateId,
            creadoPor: data.userId,
          },
        });
      }

      // 3. Verificar que la sección del template existe
      const templateSeccion = await tx.templateSeccion.findUnique({
        where: { id: data.templateSeccionId, eliminadoEn: null },
      });

      if (!templateSeccion) {
        throw new Error('Sección de template no encontrada');
      }

      // 4. Crear o actualizar observación si se proporciona
      let observacionId: bigint | null = null;
      if (data.observacion) {
        if (data.observacion.id) {
          // Actualizar observación existente
          const observacionActualizada = await tx.observacion.update({
            where: { id: BigInt(data.observacion.id) },
            data: {
              descripcion: data.observacion.descripcion,
              actualizadoPor: data.userId,
              actualizadoEn: new Date(),
            },
          });
          observacionId = observacionActualizada.id;
        } else {
          // Crear nueva observación
          const nuevaObservacion = await tx.observacion.create({
            data: {
              descripcion: data.observacion.descripcion,
              creadoPor: data.userId,
            },
          });
          observacionId = nuevaObservacion.id;
        }
      }

      // 5. Buscar si ya existe una respuesta para este templateSeccionId y eleccionTemplateId
      const eleccionRespuestaExistente = await tx.eleccionRespuesta.findFirst({
        where: {
          eleccionTemplateId: eleccionTemplate.id,
          templateSeccionId: data.templateSeccionId,
          eliminadoEn: null,
        },
        include: {
          resultadoAtributo: true,
        },
      });

      if (eleccionRespuestaExistente) {
        // Actualizar respuesta existente
        const resultadoActualizado = await tx.resultadoAtributoChecklist.update(
          {
            where: {
              id: eleccionRespuestaExistente.resultadoAtributoChecklistId,
            },
            data: {
              cumple: data.cumple,
              observacionId,
              actualizadoPor: data.userId,
              actualizadoEn: new Date(),
            },
          }
        );

        const eleccionRespuestaActualizada = await tx.eleccionRespuesta.update({
          where: { id: eleccionRespuestaExistente.id },
          data: {
            actualizadoPor: data.userId,
            actualizadoEn: new Date(),
          },
        });

        return {
          eleccionRespuesta: eleccionRespuestaActualizada,
          resultado: resultadoActualizado,
        };
      } else {
        // Crear nueva respuesta
        const nuevoResultado = await tx.resultadoAtributoChecklist.create({
          data: {
            cumple: data.cumple,
            observacionId,
            creadoPor: data.userId,
          },
        });

        const nuevaEleccionRespuesta = await tx.eleccionRespuesta.create({
          data: {
            eleccionTemplateId: eleccionTemplate.id,
            templateSeccionId: data.templateSeccionId,
            resultadoAtributoChecklistId: nuevoResultado.id,
            creadoPor: data.userId,
          },
        });

        return {
          eleccionRespuesta: nuevaEleccionRespuesta,
          resultado: nuevoResultado,
        };
      }
    });
  }

  /**
   * Obtener checklists de una inspección con sus respuestas
   */
  async getChecklists(inspeccionId: bigint) {
    const eleccionesTemplate = await this.prisma.eleccionTemplate.findMany({
      where: {
        inspeccionId,
        eliminadoEn: null,
      },
      include: {
        template: {
          include: {
            secciones: {
              where: { eliminadoEn: null },
              orderBy: { orden: 'asc' },
            },
          },
        },
        eleccionRespuestas: {
          where: { eliminadoEn: null },
          include: {
            templateSeccion: true,
            resultadoAtributo: {
              include: {
                observacion: {
                  include: {
                    archivos: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return eleccionesTemplate.map(
      (eleccion: (typeof eleccionesTemplate)[0]) => {
        const items = eleccion.template.secciones.map(
          (seccion: (typeof eleccion.template.secciones)[0]) => {
            const respuesta = eleccion.eleccionRespuestas.find(
              (r: (typeof eleccion.eleccionRespuestas)[0]) =>
                r.templateSeccionId === seccion.id
            );

            return {
              templateSeccionId: seccion.id,
              orden: seccion.orden,
              descripcion: seccion.nombre,
              cumple: respuesta?.resultadoAtributo.cumple ?? null,
              observacion: respuesta?.resultadoAtributo.observacion
                ? {
                    id: respuesta.resultadoAtributo.observacion.id.toString(),
                    descripcion:
                      respuesta.resultadoAtributo.observacion.descripcion,
                    archivos: respuesta.resultadoAtributo.observacion.archivos,
                  }
                : null,
              eleccionRespuestaId: respuesta?.id ?? null,
              resultadoId:
                respuesta?.resultadoAtributoChecklistId.toString() ?? null,
            };
          }
        );

        const progresoSI = items.filter(
          (i: (typeof items)[0]) => i.cumple === true
        ).length;
        const progresoNO = items.filter(
          (i: (typeof items)[0]) => i.cumple === false
        ).length;
        const progresoNA = items.filter(
          (i: (typeof items)[0]) =>
            i.cumple === null && i.eleccionRespuestaId !== null
        ).length;
        const completado =
          progresoSI + progresoNO + progresoNA === items.length;

        return {
          eleccionTemplateId: eleccion.id,
          templateId: eleccion.templateId,
          nombreTemplate: eleccion.template.nombre,
          items,
          completado,
          progresoSI,
          progresoNO,
          progresoNA,
          progresoTotal: items.length,
        };
      }
    );
  }

  /**
   * Agregar un template (checklist) a una inspección
   */
  async agregarTemplate(
    inspeccionId: bigint,
    templateId: number,
    userId: number
  ) {
    // Verificar que la inspección existe y no está finalizada
    const inspeccion = await this.prisma.inspeccion.findUnique({
      where: { id: inspeccionId, eliminadoEn: null },
    });

    if (!inspeccion) {
      throw new Error('Inspección no encontrada');
    }

    if (inspeccion.fechaFinalizacion) {
      throw new Error('No se puede modificar una inspección finalizada');
    }

    // Verificar que el template existe
    const template = await this.prisma.template.findUnique({
      where: { id: templateId, eliminadoEn: null },
    });

    if (!template) {
      throw new Error('Template no encontrado');
    }

    // Verificar que no esté ya agregado
    const existente = await this.prisma.eleccionTemplate.findFirst({
      where: {
        inspeccionId,
        templateId,
        eliminadoEn: null,
      },
    });

    if (existente) {
      throw new Error('Este checklist ya está agregado a la inspección');
    }

    // Crear la elección de template
    const eleccionTemplate = await this.prisma.eleccionTemplate.create({
      data: {
        inspeccionId,
        templateId,
        creadoPor: userId,
      },
    });

    return eleccionTemplate;
  }

  /**
   * Eliminar un template (checklist) de una inspección
   */
  async eliminarTemplate(
    inspeccionId: bigint,
    templateId: number,
    userId: number
  ) {
    // Verificar que la inspección existe y no está finalizada
    const inspeccion = await this.prisma.inspeccion.findUnique({
      where: { id: inspeccionId, eliminadoEn: null },
    });

    if (!inspeccion) {
      throw new Error('Inspección no encontrada');
    }

    if (inspeccion.fechaFinalizacion) {
      throw new Error('No se puede modificar una inspección finalizada');
    }

    // Buscar la elección de template
    const eleccionTemplate = await this.prisma.eleccionTemplate.findFirst({
      where: {
        inspeccionId,
        templateId,
        eliminadoEn: null,
      },
    });

    if (!eleccionTemplate) {
      throw new Error('Template no encontrado en esta inspección');
    }

    // Soft delete
    await this.prisma.eleccionTemplate.update({
      where: { id: eleccionTemplate.id },
      data: {
        eliminadoPor: userId,
        eliminadoEn: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Asignar o actualizar un usuario con un rol a una inspección
   */
  async asignarUsuario(
    inspeccionId: bigint,
    usuarioId: number,
    rolAsignacionId: number,
    userId: number
  ) {
    // Verificar que la inspección existe
    const inspeccion = await this.prisma.inspeccion.findUnique({
      where: { id: inspeccionId, eliminadoEn: null },
    });

    if (!inspeccion) {
      throw new Error('Inspección no encontrada');
    }

    // Verificar que el usuario existe
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId, eliminadoEn: null },
    });

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar que el rol existe
    const rol = await this.prisma.rolAsignacion.findUnique({
      where: { id: rolAsignacionId, eliminadoEn: null },
    });

    if (!rol) {
      throw new Error('Rol de asignación no encontrado');
    }

    // Verificar si ya existe una asignación activa
    const existente = await this.prisma.asignacionInspeccion.findFirst({
      where: {
        inspeccionId,
        usuarioId,
        eliminadoEn: null,
      },
    });

    if (existente) {
      // Actualizar el rol existente
      const actualizada = await this.prisma.asignacionInspeccion.update({
        where: { id: existente.id },
        data: {
          rolAsignacionId,
          actualizadoPor: userId,
          actualizadoEn: new Date(),
        },
      });
      return actualizada;
    }

    // Crear nueva asignación
    const asignacion = await this.prisma.asignacionInspeccion.create({
      data: {
        inspeccionId,
        usuarioId,
        rolAsignacionId,
        creadoPor: userId,
      },
    });

    return asignacion;
  }

  /**
   * Obtener roles de asignación disponibles
   */
  async getRolesAsignacion() {
    return this.prisma.rolAsignacion.findMany({
      where: { eliminadoEn: null },
      select: {
        id: true,
        nombre: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  /**
   * Eliminar una asignación de usuario de una inspección
   */
  async eliminarAsignacion(
    inspeccionId: bigint,
    usuarioId: number,
    userId: number
  ) {
    const asignacion = await this.prisma.asignacionInspeccion.findFirst({
      where: {
        inspeccionId,
        usuarioId,
        eliminadoEn: null,
      },
    });

    if (!asignacion) {
      throw new Error('Asignación no encontrada');
    }

    // Soft delete
    await this.prisma.asignacionInspeccion.update({
      where: { id: asignacion.id },
      data: {
        eliminadoPor: userId,
        eliminadoEn: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Terminar una inspección (establecer fecha de finalización)
   */
  async terminarInspeccion(id: bigint, userId: number) {
    // Verificar que la inspección existe y no está finalizada
    const inspeccion = await this.prisma.inspeccion.findUnique({
      where: { id, eliminadoEn: null },
    });

    if (!inspeccion) {
      throw new Error('Inspección no encontrada');
    }

    if (inspeccion.fechaFinalizacion) {
      throw new Error('La inspección ya está finalizada');
    }

    // Actualizar fecha de finalización
    const inspeccionActualizada = await this.prisma.inspeccion.update({
      where: { id },
      data: {
        fechaFinalizacion: new Date(),
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

    return inspeccionActualizada as unknown as InspeccionData;
  }
}
