/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs/promises';

interface ChecklistItem {
  orden: number;
  descripcion: string;
  cumple: boolean | null;
  observacion: {
    descripcion: string;
    archivos?: Array<{
      id: string;
      nombre: string;
      ruta: string | null;
      url: string | null;
    }>;
  } | null;
}

interface ChecklistData {
  nombreTemplate: string;
  items: ChecklistItem[];
}

export class ExcelExportService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Genera un archivo ZIP con el Excel de la inspección e imágenes
   */
  async generateInspeccionZip(inspeccionId: bigint): Promise<{
    buffer: Buffer;
    filename: string;
  }> {
    // 1. Obtener datos completos de la inspección
    const inspeccion = await this.prisma.inspeccion.findUnique({
      where: { id: inspeccionId },
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

    if (!inspeccion) {
      throw new Error('Inspección no encontrada');
    }

    // 2. Obtener checklists con respuestas
    const checklists = await this.getChecklistsData(inspeccionId);

    // 3. Recopilar todas las imágenes
    const imagenes = this.extractImages(checklists);

    // 4. Generar el Excel
    const excelBuffer = await this.generateExcel(
      inspeccion,
      checklists,
      imagenes
    );

    // 5. Crear ZIP con Excel + imágenes
    const zipBuffer = await this.createZip(
      excelBuffer,
      imagenes,
      inspeccion.numSerie
    );

    return {
      buffer: zipBuffer,
      filename: `Inspeccion_${inspeccion.numSerie}_${this.formatDate(new Date())}.zip`,
    };
  }

  /**
   * Obtiene los checklists con sus respuestas
   */
  private async getChecklistsData(
    inspeccionId: bigint
  ): Promise<ChecklistData[]> {
    const eleccionesTemplate = await this.prisma.eleccionTemplate.findMany({
      where: { inspeccionId },
      include: {
        template: {
          select: {
            id: true,
            nombre: true,
            secciones: {
              where: { eliminadoEn: null },
              select: {
                id: true,
                nombre: true,
                orden: true,
              },
              orderBy: { orden: 'asc' },
            },
          },
        },
        eleccionRespuestas: {
          include: {
            templateSeccion: {
              select: {
                id: true,
                nombre: true,
                orden: true,
              },
            },
            resultadoAtributo: {
              include: {
                observacion: {
                  include: {
                    archivos: {
                      select: {
                        id: true,
                        nombre: true,
                        ruta: true,
                        url: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return eleccionesTemplate.map((eleccion: any) => {
      const items: ChecklistItem[] = eleccion.template.secciones.map(
        (seccion: any) => {
          const respuesta = eleccion.eleccionRespuestas.find(
            (r: any) => r.templateSeccionId === seccion.id
          );

          return {
            orden: seccion.orden,
            descripcion: seccion.nombre,
            cumple: respuesta?.resultadoAtributo.cumple ?? null,
            observacion: respuesta?.resultadoAtributo.observacion
              ? {
                  descripcion:
                    respuesta.resultadoAtributo.observacion.descripcion,
                  archivos:
                    respuesta.resultadoAtributo.observacion.archivos.map(
                      (archivo: any) => ({
                        id: archivo.id.toString(),
                        nombre: archivo.nombre,
                        ruta: archivo.ruta,
                        url: archivo.url,
                      })
                    ),
                }
              : null,
          };
        }
      );

      return {
        nombreTemplate: eleccion.template.nombre,
        items,
      };
    });
  }

  /**
   * Extrae todas las imágenes de los checklists
   */
  private extractImages(checklists: ChecklistData[]): Array<{
    id: string;
    nombre: string;
    ruta: string | null;
  }> {
    const imagenes: Array<{ id: string; nombre: string; ruta: string | null }> =
      [];

    for (const checklist of checklists) {
      for (const item of checklist.items) {
        if (item.observacion?.archivos) {
          for (const archivo of item.observacion.archivos) {
            console.log(`🔍 Archivo encontrado:`, {
              id: archivo.id,
              nombre: archivo.nombre,
              ruta: archivo.ruta,
              url: archivo.url,
            });

            if (archivo.ruta) {
              imagenes.push({
                id: archivo.id,
                nombre: archivo.nombre,
                ruta: archivo.ruta,
              });
            }
          }
        }
      }
    }

    console.log(`📊 Total de imágenes extraídas: ${imagenes.length}`);
    return imagenes;
  }

  /**
   * Genera el archivo Excel con formato profesional
   */
  private async generateExcel(
    inspeccion: {
      id: bigint;
      numSerie: string;
      fechaInicio: Date;
      fechaFinalizacion: Date | null;
      nSerieMotor: string | null;
      cabinado: boolean | null;
      horometro: number | null;
      maquina?: { id: number; nombre: string } | null;
      asignaciones?: Array<{
        usuario: { id: number; nombre: string; correo: string };
        rolAsignacion: { id: number; nombre: string };
      }>;
    },
    checklists: ChecklistData[],
    _imagenes: Array<{ id: string; nombre: string; ruta: string | null }>
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inspección');

    // Configuración de columnas con anchos ajustables
    worksheet.columns = [
      { key: 'col1', width: 5 },
      { key: 'col2', width: 50 },
      { key: 'col3', width: 8 },
      { key: 'col4', width: 8 },
      { key: 'col5', width: 8 },
      { key: 'col6', width: 40 },
      { key: 'col7', width: 40 },
    ];

    let currentRow = 1;

    // ========== CABECERA ==========
    // Título principal
    worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = 'REPORTE DE INSPECCIÓN DE MAQUINARIA';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFED1B2E' },
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(currentRow).height = 30;
    currentRow += 2;

    // ========== SECCIONES 1 Y 2 LADO A LADO ==========
    const asignaciones = inspeccion.asignaciones || [];
    const startRow = currentRow;
    let leftRow = startRow;
    let rightRow = startRow;

    // ===== SECCIÓN 1 (IZQUIERDA): Número de Serie, Fechas y Personal =====
    // Número de Serie
    worksheet.getCell(`A${leftRow}`).value = 'N° Serie:';
    worksheet.getCell(`A${leftRow}`).font = { bold: true };
    worksheet.mergeCells(`B${leftRow}:C${leftRow}`);
    worksheet.getCell(`B${leftRow}`).value = inspeccion.numSerie;
    leftRow++;

    // Fecha Inicio
    worksheet.getCell(`A${leftRow}`).value = 'Fecha Inicio:';
    worksheet.getCell(`A${leftRow}`).font = { bold: true };
    worksheet.mergeCells(`B${leftRow}:C${leftRow}`);
    worksheet.getCell(`B${leftRow}`).value = this.formatDateTime(
      inspeccion.fechaInicio
    );
    leftRow++;

    // Fecha Fin
    worksheet.getCell(`A${leftRow}`).value = 'Fecha Fin:';
    worksheet.getCell(`A${leftRow}`).font = { bold: true };
    worksheet.mergeCells(`B${leftRow}:C${leftRow}`);
    worksheet.getCell(`B${leftRow}`).value = inspeccion.fechaFinalizacion
      ? this.formatDateTime(inspeccion.fechaFinalizacion)
      : '-';
    leftRow++;

    // Personal asignado
    if (asignaciones.length > 0) {
      // Ordenar por rol: Inspector (1), Supervisor (2), Técnico (3)
      const asignacionesOrdenadas = [...asignaciones].sort((a, b) => {
        return a.rolAsignacion.id - b.rolAsignacion.id;
      });

      // Agrupar por rol
      const roleCounters: Record<string, number> = {};

      for (const asignacion of asignacionesOrdenadas) {
        const roleName = asignacion.rolAsignacion.nombre;

        // Incrementar contador
        if (!roleCounters[roleName]) {
          roleCounters[roleName] = 0;
        }
        roleCounters[roleName]++;

        const counter = roleCounters[roleName];

        // Mostrar sin número para el primero, con número a partir del segundo
        const label =
          counter === 1 ? `${roleName}:` : `${roleName} ${counter}:`;

        worksheet.getCell(`A${leftRow}`).value = label;
        worksheet.getCell(`A${leftRow}`).font = { bold: true };
        worksheet.mergeCells(`B${leftRow}:C${leftRow}`);
        worksheet.getCell(`B${leftRow}`).value =
          `${asignacion.usuario.nombre} (${asignacion.usuario.correo})`;
        leftRow++;
      }
    }

    // ===== SECCIÓN 2 (DERECHA): Máquina, Motor, Cabinado, Horómetro =====
    // Máquina
    worksheet.getCell(`E${rightRow}`).value = 'Máquina:';
    worksheet.getCell(`E${rightRow}`).font = { bold: true };
    worksheet.mergeCells(`F${rightRow}:G${rightRow}`);
    worksheet.getCell(`F${rightRow}`).value =
      inspeccion.maquina?.nombre || 'N/A';
    rightRow++;

    // N° Serie Motor
    worksheet.getCell(`E${rightRow}`).value = 'N° Serie Motor:';
    worksheet.getCell(`E${rightRow}`).font = { bold: true };
    worksheet.mergeCells(`F${rightRow}:G${rightRow}`);
    worksheet.getCell(`F${rightRow}`).value = inspeccion.nSerieMotor || '-';
    rightRow++;

    // Cabinado
    worksheet.getCell(`E${rightRow}`).value = 'Cabinado:';
    worksheet.getCell(`E${rightRow}`).font = { bold: true };
    worksheet.getCell(`F${rightRow}`).value =
      inspeccion.cabinado !== null ? (inspeccion.cabinado ? 'Sí' : 'No') : '-';
    rightRow++;

    // Horómetro
    worksheet.getCell(`E${rightRow}`).value = 'Horómetro:';
    worksheet.getCell(`E${rightRow}`).font = { bold: true };
    worksheet.mergeCells(`F${rightRow}:G${rightRow}`);
    worksheet.getCell(`F${rightRow}`).value = inspeccion.horometro
      ? `${inspeccion.horometro} hrs`
      : '-';
    rightRow++;

    // Avanzar al máximo de ambas secciones
    currentRow = Math.max(leftRow, rightRow) + 1;

    // ========== CHECKLISTS ==========
    for (const checklist of checklists) {
      // Título del checklist
      worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
      const checklistTitleCell = worksheet.getCell(`A${currentRow}`);
      checklistTitleCell.value = checklist.nombreTemplate;
      checklistTitleCell.font = {
        size: 12,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      checklistTitleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFED1B2E' },
      };
      checklistTitleCell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };
      worksheet.getRow(currentRow).height = 25;
      currentRow++;

      // Encabezado de tabla
      const headerRow = worksheet.getRow(currentRow);
      headerRow.values = [
        '#',
        'ÍTEM',
        'SÍ',
        'NO',
        'N/A',
        'OBSERVACIONES',
        'ARCHIVOS',
      ];
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 20;

      // Bordes del encabezado
      for (let col = 1; col <= 7; col++) {
        const cell = headerRow.getCell(col);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
      currentRow++;

      // Ítems del checklist
      for (const item of checklist.items) {
        const row = worksheet.getRow(currentRow);

        // Número
        const numCell = row.getCell(1);
        numCell.value = item.orden;
        numCell.alignment = { vertical: 'middle', horizontal: 'center' };
        numCell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        // Descripción
        const descCell = row.getCell(2);
        descCell.value = item.descripcion;
        descCell.alignment = {
          vertical: 'middle',
          horizontal: 'left',
          wrapText: true,
        };
        descCell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        // SÍ/NO/N/A
        for (let col = 3; col <= 5; col++) {
          const cell = row.getCell(col);
          const isChecked =
            (col === 3 && item.cumple === true) ||
            (col === 4 && item.cumple === false) ||
            (col === 5 && item.cumple === null);

          cell.value = isChecked ? 'X' : '';
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = { bold: true, size: 12 };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        }

        // Observaciones (solo texto)
        const obsCell = row.getCell(6);
        const hasObservacion = item.observacion?.descripcion;
        obsCell.value = hasObservacion || '-';
        obsCell.alignment = {
          vertical: 'top',
          horizontal: hasObservacion ? 'left' : 'center',
          wrapText: true,
        };
        obsCell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        // Archivos (como hipervínculos)
        const archivosCell = row.getCell(7);
        const hasArchivos =
          item.observacion?.archivos && item.observacion.archivos.length > 0;

        if (hasArchivos && item.observacion?.archivos) {
          const archivos = item.observacion.archivos;

          // En Excel, solo se puede tener un hipervínculo por celda
          // Mostraremos todos los archivos como texto con hipervínculo al primero
          const primerArchivo = archivos[0];
          if (primerArchivo) {
            archivosCell.value = {
              text: archivos.map(a => a.nombre).join('\n'),
              hyperlink: `archivos/${primerArchivo.nombre}`,
            };
            archivosCell.font = {
              underline: true,
              color: { argb: 'FF0563C1' },
            };
          }
        } else {
          archivosCell.value = '-';
        }

        archivosCell.alignment = {
          vertical: 'top',
          horizontal: hasArchivos ? 'left' : 'center',
          wrapText: true,
        };
        archivosCell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        // Ajustar altura de fila automáticamente según el contenido más largo
        const maxLines = Math.max(
          item.descripcion?.split('\n').length || 1,
          item.observacion?.descripcion?.split('\n').length || 1,
          item.observacion?.archivos?.length || 1
        );
        row.height = Math.max(20, maxLines * 15);

        currentRow++;
      }

      currentRow += 1;
    }

    // Ajustar anchos de columna automáticamente
    worksheet.columns.forEach(column => {
      if (!column.eachCell) return;

      let maxLength = 0;
      column.eachCell({ includeEmpty: false }, cell => {
        const cellValue = cell.value?.toString() || '';
        const cellLength = cellValue.split('\n').reduce((max, line) => {
          return Math.max(max, line.length);
        }, 0);
        maxLength = Math.max(maxLength, cellLength);
      });

      // Establecer ancho mínimo y máximo
      column.width = Math.min(Math.max(maxLength + 2, 8), 60);
    });

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Crea un archivo ZIP con el Excel y las imágenes
   */
  private async createZip(
    excelBuffer: Buffer,
    imagenes: Array<{ id: string; nombre: string; ruta: string | null }>,
    numSerie: string
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      // Agregar Excel al ZIP
      archive.append(excelBuffer, { name: `Inspeccion_${numSerie}.xlsx` });

      console.log(`📦 Preparando ZIP con ${imagenes.length} imágenes`);

      // Capturar los datos del stream
      archive.on('data', chunk => chunks.push(chunk));

      archive.on('end', () => {
        console.log('✅ ZIP generado correctamente');
        resolve(Buffer.concat(chunks));
      });

      archive.on('error', err => {
        console.error('❌ Error al crear ZIP:', err);
        reject(err);
      });

      // Agregar imágenes a la carpeta "archivos/"
      const addImages = async () => {
        for (const imagen of imagenes) {
          if (imagen.ruta) {
            try {
              // Resolver la ruta absoluta desde el directorio de uploads
              const basePath = path.resolve(process.cwd(), 'uploads');
              const imagePath = path.join(basePath, imagen.ruta);

              console.log(`📷 Intentando leer imagen: ${imagePath}`);

              const imageBuffer = await fs.readFile(imagePath);
              archive.append(imageBuffer, {
                name: `archivos/${imagen.nombre}`,
              });

              console.log(`✅ Imagen agregada: ${imagen.nombre}`);
            } catch (error) {
              console.error(`❌ Error al leer imagen ${imagen.nombre}:`, error);
              console.error(`   Ruta intentada: ${imagen.ruta}`);
            }
          }
        }

        // Finalizar el archivo después de agregar todo
        await archive.finalize();
      };

      addImages().catch(reject);
    });
  }

  /**
   * Formatea una fecha a formato DD/MM/YYYY HH:mm
   */
  private formatDateTime(date: Date | string): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  /**
   * Formatea una fecha para nombre de archivo YYYYMMDD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}
