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

// Colores de la empresa
const BRAND_COLORS = {
  primary: 'FFED1B2E', // Rojo principal
  dark: 'FF0F172A', // Azul oscuro
  light: 'FFF5F5F5', // Gris claro para fondos
  accent: 'FF1A1F3A', // Variante oscura
  text: 'FF2C3E50', // Texto principal
  lightGray: 'FFECF0F1', // Gris muy claro
  success: 'FF27AE60', // Verde para aprobado
  warning: 'FFF39C12', // Naranja para advertencia
  danger: 'FFE74C3C', // Rojo suave para rechazo
  border: 'FFD1D5DB', // Gris para bordes
};

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
            console.log(`Archivo encontrado:`, {
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

    console.log(`Total de imágenes extraídas: ${imagenes.length}`);
    return imagenes;
  }

  /**
   * Genera el archivo Excel con formato profesional mejorado
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

    // Configuración de columnas con anchos optimizados
    worksheet.columns = [
      { key: 'col1', width: 5 },
      { key: 'col2', width: 45 },
      { key: 'col3', width: 10 },
      { key: 'col4', width: 10 },
      { key: 'col5', width: 10 },
      { key: 'col6', width: 35 },
      { key: 'col7', width: 35 },
    ];

    let currentRow = 1;

    // ========== CABECERA PROFESIONAL ==========
    // Franja superior con colores
    worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const topBanner = worksheet.getCell(`A${currentRow}`);
    topBanner.value = '';
    topBanner.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: BRAND_COLORS.dark },
    };
    worksheet.getRow(currentRow).height = 8;
    currentRow++;

    // Título principal
    worksheet.getRow(currentRow).height = 32; // Establecer altura ANTES de mergeCells y estilos
    worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
    // Aplicar estilo solo a las columnas que usamos (A-G)
    for (let col = 1; col <= 7; col++) {
      const cell = worksheet.getCell(currentRow, col);
      if (col === 1) {
        cell.value = '⬤ REPORTE DE INSPECCIÓN';
      }
      cell.font = {
        size: 18,
        bold: true,
        color: { argb: 'FFFFFFFF' },
        name: 'Calibri',
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: BRAND_COLORS.primary },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'left',
        indent: 1,
      };
    }
    currentRow++;

    // Subtítulo descriptivo
    worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const subtitleCell = worksheet.getCell(`A${currentRow}`);
    subtitleCell.value = `Inspección de Maquinaria - Serie: ${inspeccion.numSerie}`;
    subtitleCell.font = {
      size: 11,
      color: { argb: 'FF666666' },
      italic: true,
      name: 'Calibri',
    };
    subtitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: BRAND_COLORS.lightGray },
    };
    subtitleCell.alignment = {
      vertical: 'middle',
      horizontal: 'left',
      indent: 1,
    };
    worksheet.getRow(currentRow).height = 18;
    currentRow++;

    // Espacio
    currentRow++;

    // ========== SECCIONES DE INFORMACIÓN LADO A LADO ==========
    const asignaciones = inspeccion.asignaciones || [];
    const startRow = currentRow;
    let leftRow = startRow;
    let rightRow = startRow;

    // ===== SECCIÓN 1 (IZQUIERDA): Información de Inspección =====
    this.addInfoSection(
      worksheet,
      'A:C',
      startRow,
      'INFORMACIÓN DE INSPECCIÓN',
      [
        { label: 'N° de Serie:', value: inspeccion.numSerie },
        {
          label: 'Fecha Inicio:',
          value: this.formatDateTime(inspeccion.fechaInicio),
        },
        {
          label: 'Fecha Finalización:',
          value: inspeccion.fechaFinalizacion
            ? this.formatDateTime(inspeccion.fechaFinalizacion)
            : 'En progreso',
        },
      ]
    );
    leftRow = startRow + 5;

    // Personal asignado
    if (asignaciones.length > 0) {
      worksheet.mergeCells(`A${leftRow}:C${leftRow}`);
      const personaHeaderCell = worksheet.getCell(`A${leftRow}`);
      personaHeaderCell.value = 'PERSONAL ASIGNADO';
      personaHeaderCell.font = {
        bold: true,
        size: 11,
        color: { argb: 'FFFFFFFF' },
        name: 'Calibri',
      };
      personaHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: BRAND_COLORS.dark },
      };
      personaHeaderCell.alignment = {
        vertical: 'middle',
        horizontal: 'left',
        indent: 0.5,
      };
      worksheet.getRow(leftRow).height = 20;
      leftRow++;

      const asignacionesOrdenadas = [...asignaciones].sort((a, b) => {
        return a.rolAsignacion.id - b.rolAsignacion.id;
      });

      const roleCounters: Record<string, number> = {};

      for (const asignacion of asignacionesOrdenadas) {
        const roleName = asignacion.rolAsignacion.nombre;

        if (!roleCounters[roleName]) {
          roleCounters[roleName] = 0;
        }

        roleCounters[roleName]++;
        const counter = roleCounters[roleName];
        const label =
          counter === 1 ? `${roleName}:` : `${roleName} ${counter}:`;

        const roleCell = worksheet.getCell(`A${leftRow}`);
        roleCell.value = label;
        roleCell.font = { bold: true, color: { argb: BRAND_COLORS.dark } };
        worksheet.mergeCells(`B${leftRow}:C${leftRow}`);
        const nameCell = worksheet.getCell(`B${leftRow}`);
        nameCell.value = `${asignacion.usuario.nombre}`;
        nameCell.font = { size: 10, color: { argb: BRAND_COLORS.text } };

        worksheet.getRow(leftRow).height = 16;
        leftRow++;

        // Email en la siguiente línea con indentación
        worksheet.mergeCells(`A${leftRow}:C${leftRow}`);
        const emailCell = worksheet.getCell(`A${leftRow}`);
        emailCell.value = asignacion.usuario.correo;
        emailCell.font = {
          size: 9,
          italic: true,
          color: { argb: 'FF888888' },
        };
        emailCell.alignment = { indent: 1 };
        worksheet.getRow(leftRow).height = 14;
        leftRow++;
      }
    }

    // ===== SECCIÓN 2 (DERECHA): Información de Máquina =====
    this.addInfoSection(worksheet, 'E:G', startRow, 'DATOS DE MÁQUINA', [
      { label: 'Máquina:', value: inspeccion.maquina?.nombre || 'N/A' },
      {
        label: 'N° Serie Motor:',
        value: inspeccion.nSerieMotor || '—',
      },
      {
        label: 'Cabinado:',
        value:
          inspeccion.cabinado !== null
            ? inspeccion.cabinado
              ? 'Sí ✓'
              : 'No'
            : '—',
      },
      {
        label: 'Horómetro:',
        value: inspeccion.horometro ? `${inspeccion.horometro} hrs` : '—',
      },
    ]);

    rightRow = startRow + 5; // Header + 4 campos

    // Avanzar al máximo de ambas secciones
    currentRow = Math.max(leftRow, rightRow) + 2;

    // ========== CHECKLISTS CON DISEÑO MEJORADO ==========
    for (const checklist of checklists) {
      // Separator
      currentRow++;

      // Encabezado del checklist
      worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
      const checklistTitleCell = worksheet.getCell(`A${currentRow}`);
      checklistTitleCell.value = `${checklist.nombreTemplate}`;
      checklistTitleCell.font = {
        size: 12,
        bold: true,
        color: { argb: 'FFFFFFFF' },
        name: 'Calibri',
      };
      checklistTitleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: BRAND_COLORS.dark },
      };
      checklistTitleCell.alignment = {
        vertical: 'middle',
        horizontal: 'left',
        indent: 0.5,
      };
      worksheet.getRow(currentRow).height = 24;
      currentRow++;

      // Encabezado de tabla con estilos mejorados
      worksheet.getRow(currentRow).height = 24;
      const headerValues = [
        '#',
        'ÍTEM',
        '✓',
        '✗',
        'N/A',
        'OBSERVACIONES',
        'ARCHIVOS',
      ];

      // Aplicar estilos SOLO a las celdas individuales (columnas 1-7)
      for (let col = 1; col <= 7; col++) {
        const cell = worksheet.getCell(currentRow, col);
        cell.value = headerValues[col - 1];
        cell.font = {
          bold: true,
          size: 10,
          color: { argb: 'FFFFFFFF' },
          name: 'Calibri',
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: BRAND_COLORS.primary },
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true,
        };
        cell.border = {
          top: { style: 'medium', color: { argb: BRAND_COLORS.dark } },
          left: { style: 'thin', color: { argb: BRAND_COLORS.dark } },
          bottom: { style: 'medium', color: { argb: BRAND_COLORS.dark } },
          right: { style: 'thin', color: { argb: BRAND_COLORS.dark } },
        };
      }
      currentRow++;

      // Ítems del checklist con alternancia de colores
      let itemIndex = 0;
      for (const item of checklist.items) {
        const row = worksheet.getRow(currentRow);

        // Color de fondo alternado
        const backgroundColor =
          itemIndex % 2 === 0 ? BRAND_COLORS.lightGray : 'FFFFFFFF';

        // Número
        const numCell = row.getCell(1);
        numCell.value = item.orden;
        numCell.alignment = { vertical: 'middle', horizontal: 'center' };
        numCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: backgroundColor },
        };
        numCell.border = {
          top: { style: 'thin', color: { argb: BRAND_COLORS.border } },
          left: { style: 'thin', color: { argb: BRAND_COLORS.border } },
          bottom: { style: 'thin', color: { argb: BRAND_COLORS.border } },
          right: { style: 'thin', color: { argb: BRAND_COLORS.border } },
        };

        // Descripción
        const descCell = row.getCell(2);
        descCell.value = item.descripcion;
        descCell.alignment = {
          vertical: 'middle',
          horizontal: 'left',
          wrapText: true,
        };
        descCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: backgroundColor },
        };
        descCell.border = {
          top: { style: 'thin', color: { argb: BRAND_COLORS.border } },
          left: { style: 'thin', color: { argb: BRAND_COLORS.border } },
          bottom: { style: 'thin', color: { argb: BRAND_COLORS.border } },
          right: { style: 'thin', color: { argb: BRAND_COLORS.border } },
        };

        // ✓ / ✗ / N/A con colores según estado
        for (let col = 3; col <= 5; col++) {
          const cell = row.getCell(col);
          const isChecked =
            (col === 3 && item.cumple === true) ||
            (col === 4 && item.cumple === false) ||
            (col === 5 && item.cumple === null);

          cell.value = isChecked ? '⬤' : '';
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = {
            bold: true,
            size: 14,
            color: { argb: 'FFFFFFFF' },
          };

          // Color de fondo según estado
          let statusColor = backgroundColor;
          if (isChecked) {
            if (col === 3)
              statusColor = BRAND_COLORS.success; // Verde para Sí
            else if (col === 4)
              statusColor = BRAND_COLORS.danger; // Rojo para No
            else if (col === 5) statusColor = BRAND_COLORS.warning; // Naranja para N/A
          }

          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: statusColor },
          };
          cell.border = {
            top: { style: 'thin', color: { argb: BRAND_COLORS.border } },
            left: { style: 'thin', color: { argb: BRAND_COLORS.border } },
            bottom: { style: 'thin', color: { argb: BRAND_COLORS.border } },
            right: { style: 'thin', color: { argb: BRAND_COLORS.border } },
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
        obsCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: backgroundColor },
        };
        obsCell.border = {
          top: { style: 'thin', color: { argb: BRAND_COLORS.border } },
          left: { style: 'thin', color: { argb: BRAND_COLORS.border } },
          bottom: { style: 'thin', color: { argb: BRAND_COLORS.border } },
          right: { style: 'thin', color: { argb: BRAND_COLORS.border } },
        };

        // Archivos (numerados con hipervínculos)
        const archivosCell = row.getCell(7);
        const hasArchivos =
          item.observacion?.archivos && item.observacion.archivos.length > 0;

        if (hasArchivos && item.observacion?.archivos) {
          const archivos = item.observacion.archivos;

          // En Excel, solo se puede tener un hipervínculo por celda
          // Mostraremos todos los archivos numerados con hipervínculo al primero
          const primerArchivo = archivos[0];
          if (primerArchivo) {
            const archivosList = archivos
              .map((a, idx) => `${idx + 1}. ${a.nombre}`)
              .join('\n');
            archivosCell.value = {
              text: archivosList,
              hyperlink: `archivos/${primerArchivo.nombre}`,
            };
            archivosCell.font = {
              underline: true,
              color: { argb: 'FF0563C1' },
              size: 10,
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
        archivosCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: backgroundColor },
        };
        archivosCell.border = {
          top: { style: 'thin', color: { argb: BRAND_COLORS.border } },
          left: { style: 'thin', color: { argb: BRAND_COLORS.border } },
          bottom: { style: 'thin', color: { argb: BRAND_COLORS.border } },
          right: { style: 'thin', color: { argb: BRAND_COLORS.border } },
        };

        // Ajustar altura de fila automáticamente según el contenido más largo
        const maxLines = Math.max(
          item.descripcion?.split('\n').length || 1,
          item.observacion?.descripcion?.split('\n').length || 1,
          item.observacion?.archivos?.length || 1
        );
        row.height = Math.max(20, maxLines * 15);

        currentRow++;
        itemIndex++;
      }

      currentRow += 1;
    }

    // ========== FOOTER CON TIMESTAMP ==========
    currentRow += 2;
    worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const footerCell = worksheet.getCell(`A${currentRow}`);
    const timestamp = new Date().toLocaleString('es-CL', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
    footerCell.value = `Documento generado el ${timestamp}`;
    footerCell.font = {
      size: 9,
      italic: true,
      color: { argb: 'FF6B7280' },
      name: 'Calibri',
    };
    footerCell.alignment = {
      vertical: 'middle',
      horizontal: 'right',
    };

    // Ajustar anchos de columna automáticamente (solo columnas A-G)
    for (let colIndex = 1; colIndex <= 7; colIndex++) {
      const column = worksheet.getColumn(colIndex);
      if (!column.eachCell) continue;

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
    }

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Método auxiliar para agregar secciones de información con estilo profesional
   */
  private addInfoSection(
    worksheet: ExcelJS.Worksheet,
    cellRange: string,
    startRow: number,
    title: string,
    fields: Array<{ label: string; value: string }>
  ): void {
    // cellRange debe ser como "A:C" o "E:G"
    const columns = cellRange.split(':');
    const startCol = columns[0];
    const endCol = columns[1] || startCol;

    // Encabezado de sección
    worksheet.mergeCells(`${startCol}${startRow}:${endCol}${startRow}`);
    const headerCell = worksheet.getCell(`${startCol}${startRow}`);
    headerCell.value = title;
    headerCell.font = {
      bold: true,
      size: 11,
      color: { argb: 'FFFFFFFF' },
      name: 'Calibri',
    };
    headerCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: BRAND_COLORS.dark },
    };
    headerCell.alignment = {
      vertical: 'middle',
      horizontal: 'left',
      indent: 0.5,
    };
    worksheet.getRow(startRow).height = 20;

    let row = startRow + 1;

    // Campos de información
    for (const field of fields) {
      // Merge de la fila completa del campo
      worksheet.mergeCells(`${startCol}${row}:${endCol}${row}`);

      const labelCell = worksheet.getCell(`${startCol}${row}`);
      labelCell.value = `${field.label} ${field.value}`;
      labelCell.font = {
        size: 10,
        color: { argb: BRAND_COLORS.text },
        name: 'Calibri',
      };
      labelCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: BRAND_COLORS.lightGray },
      };
      labelCell.alignment = {
        vertical: 'middle',
        horizontal: 'left',
        indent: 0.5,
      };

      worksheet.getRow(row).height = 18;
      row++;
    }
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

      console.log(`Preparando ZIP con ${imagenes.length} imágenes`);

      // Capturar los datos del stream
      archive.on('data', chunk => chunks.push(chunk));

      archive.on('end', () => {
        console.log('ZIP generado correctamente');
        resolve(Buffer.concat(chunks));
      });

      archive.on('error', err => {
        console.error('Error al crear ZIP:', err);
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

              console.log(`Intentando leer imagen: ${imagePath}`);

              const imageBuffer = await fs.readFile(imagePath);
              archive.append(imageBuffer, {
                name: `archivos/${imagen.nombre}`,
              });

              console.log(`Imagen agregada: ${imagen.nombre}`);
            } catch (error) {
              console.error(`Error al leer imagen ${imagen.nombre}:`, error);
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
