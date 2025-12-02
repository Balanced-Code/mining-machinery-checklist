import type { PrismaClient, Prisma } from '@prisma/client';
import type {
  InspeccionData,
  CreateInspeccionCompleteData,
  UpdateInspeccionData,
} from '@/models/inspeccion';
import type { ArchivosService } from './archivosService';

export class InspeccionesService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly archivosService?: ArchivosService
  ) {}

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
          archivosExistentes?: number[];
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

      // 4. Manejar observación
      let observacionId: bigint | null = null;

      // Si hay una observación existente pero viene vacía (sin descripción y sin archivos), eliminarla
      if (data.observacion?.id) {
        const idValido =
          typeof data.observacion.id === 'number' &&
          data.observacion.id > 0 &&
          data.observacion.id < 1000000000000;

        if (idValido) {
          const observacionExistente = await tx.observacion.findUnique({
            where: { id: BigInt(data.observacion.id) },
            include: { archivos: true },
          });

          if (observacionExistente) {
            const descripcionVacia = !data.observacion.descripcion?.trim();
            const sinArchivosNuevos =
              !data.observacion.archivosExistentes ||
              data.observacion.archivosExistentes.length === 0;

            // Si la observación queda vacía (sin descripción y sin archivos), eliminarla
            if (descripcionVacia && sinArchivosNuevos) {
              // Eliminar archivos asociados si el servicio está disponible
              if (this.archivosService) {
                for (const archivo of observacionExistente.archivos) {
                  try {
                    await this.archivosService.eliminarArchivo(
                      archivo.id,
                      data.userId
                    );
                  } catch (_error) {
                    // Continuar aunque falle (archivo podría estar compartido)
                  }
                }
              }

              // Eliminar la observación
              await tx.observacion.delete({
                where: { id: BigInt(data.observacion.id) },
              });

              observacionId = null;
            } else {
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

              // Vincular archivos existentes a la observación
              if (
                data.observacion.archivosExistentes &&
                data.observacion.archivosExistentes.length > 0
              ) {
                await tx.archivo.updateMany({
                  where: { id: { in: data.observacion.archivosExistentes } },
                  data: { observacionId: observacionActualizada.id },
                });
              }
            }
          }
        }
      } else if (data.observacion && data.observacion.descripcion?.trim()) {
        // Crear nueva observación solo si tiene descripción
        const nuevaObservacion = await tx.observacion.create({
          data: {
            descripcion: data.observacion.descripcion,
            creadoPor: data.userId,
          },
        });
        observacionId = nuevaObservacion.id;

        // Vincular archivos existentes a la nueva observación
        if (
          data.observacion.archivosExistentes &&
          data.observacion.archivosExistentes.length > 0
        ) {
          await tx.archivo.updateMany({
            where: { id: { in: data.observacion.archivosExistentes } },
            data: { observacionId: nuevaObservacion.id },
          });
        }
      }

      // 5. Buscar si ya existe una respuesta para este templateSeccionId y eleccionTemplateId
      const eleccionRespuestaExistente = await tx.eleccionRespuesta.findFirst({
        where: {
          eleccionTemplateId: eleccionTemplate.id,
          templateSeccionId: data.templateSeccionId,
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
   * Eliminar un template (checklist) de una inspección (hard delete)
   */
  async eliminarTemplate(inspeccionId: bigint, templateId: number) {
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
      },
    });

    if (!eleccionTemplate) {
      throw new Error('Template no encontrado en esta inspección');
    }

    // Hard delete - eliminar en cascada las respuestas primero
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Eliminar las respuestas asociadas
      await tx.eleccionRespuesta.deleteMany({
        where: {
          eleccionTemplateId: eleccionTemplate.id,
        },
      });

      // Eliminar la elección de template
      await tx.eleccionTemplate.delete({
        where: { id: eleccionTemplate.id },
      });
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
   * Eliminar una asignación de usuario de una inspección (hard delete)
   */
  async eliminarAsignacion(
    inspeccionId: bigint,
    usuarioId: number,
    userId: number
  ) {
    console.log('🗑️ eliminarAsignacion - Parámetros recibidos:', {
      inspeccionId: inspeccionId.toString(),
      usuarioId,
      userId,
      tipos: {
        inspeccionId: typeof inspeccionId,
        usuarioId: typeof usuarioId,
      },
    });

    // Primero veamos TODAS las asignaciones de esta inspección
    const todasAsignaciones = await this.prisma.asignacionInspeccion.findMany({
      where: { inspeccionId },
    });

    console.log(
      '📋 TODAS las asignaciones de la inspección:',
      JSON.stringify(
        todasAsignaciones,
        (key, value) => (typeof value === 'bigint' ? value.toString() : value),
        2
      )
    );

    // Ahora intentemos encontrar la específica
    const asignacionesFiltradas =
      await this.prisma.asignacionInspeccion.findMany({
        where: {
          inspeccionId,
          usuarioId,
        },
      });

    console.log(
      '🔍 Asignaciones filtradas (sin verificar eliminadoEn):',
      JSON.stringify(
        asignacionesFiltradas,
        (key, value) => (typeof value === 'bigint' ? value.toString() : value),
        2
      )
    );

    // Hard delete - eliminamos físicamente el registro (sin importar eliminadoEn)
    const resultado = await this.prisma.asignacionInspeccion.deleteMany({
      where: {
        inspeccionId,
        usuarioId,
      },
    });

    if (resultado.count === 0) {
      throw new Error('Asignación no encontrada');
    }

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

  /**
   * Eliminar una inspección
   * - Si está finalizada: soft delete (solo nivel 3+)
   * - Si NO está finalizada: hard delete (solo nivel 3+)
   */
  async deleteInspeccion(
    id: bigint,
    userId: number
  ): Promise<{ isHardDelete: boolean }> {
    // Verificar que la inspección existe
    const inspeccion = await this.prisma.inspeccion.findUnique({
      where: { id },
    });

    if (!inspeccion) {
      throw new Error('Inspección no encontrada');
    }

    // Si ya está eliminada (soft delete), no se puede eliminar de nuevo
    if (inspeccion.eliminadoEn) {
      throw new Error('La inspección ya está eliminada');
    }

    // Si está finalizada: soft delete
    if (inspeccion.fechaFinalizacion) {
      await this.prisma.inspeccion.update({
        where: { id },
        data: {
          eliminadoPor: userId,
          eliminadoEn: new Date(),
        },
      });

      return { isHardDelete: false };
    }

    // Si NO está finalizada: hard delete
    // Primero eliminar las relaciones en cascada
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Obtener todas las observaciones asociadas a esta inspección
      const eleccionesTemplate = await tx.eleccionTemplate.findMany({
        where: { inspeccionId: id },
        include: {
          eleccionRespuestas: {
            include: {
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

      // 2. Recolectar todos los archivos que deben eliminarse
      const archivosIds: bigint[] = [];
      const observacionesIds: bigint[] = [];

      for (const eleccion of eleccionesTemplate) {
        for (const respuesta of eleccion.eleccionRespuestas) {
          const observacion = respuesta.resultadoAtributo.observacion;
          if (observacion) {
            observacionesIds.push(observacion.id);
            for (const archivo of observacion.archivos) {
              archivosIds.push(archivo.id);
            }
          }
        }
      }

      // 3. Eliminar archivos físicos y registros
      if (this.archivosService && archivosIds.length > 0) {
        for (const archivoId of archivosIds) {
          try {
            await this.archivosService.eliminarArchivo(archivoId, userId);
          } catch (error) {
            // Log pero continuar - el archivo podría estar compartido
            console.warn(`Error eliminando archivo ${archivoId}:`, error);
          }
        }
      }

      // 4. Eliminar observaciones
      if (observacionesIds.length > 0) {
        await tx.observacion.deleteMany({
          where: { id: { in: observacionesIds } },
        });
      }

      // 5. Eliminar asignaciones
      await tx.asignacionInspeccion.deleteMany({
        where: { inspeccionId: id },
      });

      // 6. Eliminar elecciones de templates y sus respuestas
      const eleccionTemplateIds: bigint[] = [];
      for (const et of eleccionesTemplate) {
        eleccionTemplateIds.push(et.id);
      }

      if (eleccionTemplateIds.length > 0) {
        // Obtener resultados para eliminarlos después
        const respuestas = await tx.eleccionRespuesta.findMany({
          where: { eleccionTemplateId: { in: eleccionTemplateIds } },
          select: { resultadoAtributoChecklistId: true },
        });

        const resultadoIds: bigint[] = [];
        for (const r of respuestas) {
          resultadoIds.push(r.resultadoAtributoChecklistId);
        }

        // Eliminar respuestas
        await tx.eleccionRespuesta.deleteMany({
          where: { eleccionTemplateId: { in: eleccionTemplateIds } },
        });

        // Eliminar resultados
        if (resultadoIds.length > 0) {
          await tx.resultadoAtributoChecklist.deleteMany({
            where: { id: { in: resultadoIds } },
          });
        }

        // Eliminar elecciones de template
        await tx.eleccionTemplate.deleteMany({
          where: { inspeccionId: id },
        });
      }

      // 7. Finalmente eliminar la inspección
      await tx.inspeccion.delete({
        where: { id },
      });
    });

    return { isHardDelete: true };
  }

  /**
   * Reactivar una inspección eliminada (solo soft delete)
   * Solo administradores (nivel 4)
   */
  async reactivarInspeccion(
    id: bigint,
    userId: number
  ): Promise<InspeccionData> {
    // Verificar que la inspección existe y está eliminada
    const inspeccion = await this.prisma.inspeccion.findUnique({
      where: { id },
    });

    if (!inspeccion) {
      throw new Error('Inspección no encontrada');
    }

    if (!inspeccion.eliminadoEn) {
      throw new Error('La inspección no está eliminada');
    }

    // Reactivar (quitar soft delete)
    const inspeccionReactivada = await this.prisma.inspeccion.update({
      where: { id },
      data: {
        eliminadoPor: null,
        eliminadoEn: null,
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

    return inspeccionReactivada as unknown as InspeccionData;
  }

  /**
   * Obtener todas las inspecciones incluyendo eliminadas (solo nivel 4)
   */
  async getAllInspeccionesIncludingDeleted(): Promise<InspeccionData[]> {
    const inspecciones = await this.prisma.inspeccion.findMany({
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
}
