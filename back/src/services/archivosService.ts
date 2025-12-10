import type { PrismaClient } from '@/generated/prisma';
import type {
  ActualizarArchivoParams,
  ArchivoDetails,
  ListarArchivosParams,
} from '@/models/archivo';
import { CategoriaArchivo } from '@/models/archivo';
import type { MultipartFile } from '@fastify/multipart';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { access, mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
/**
 * MIME types permitidos por categoría
 */
const MIME_TYPES_POR_CATEGORIA: Record<CategoriaArchivo, string[]> = {
  imagen: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ],
  pdf: ['application/pdf'],
  documento: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
  video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  otro: ['application/octet-stream'],
};

export class ArchivosService {
  private uploadsDir: string;

  constructor(private prisma: PrismaClient) {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
  }

  /**
   * Determina la categoría de un archivo según su MIME type
   */
  private determinarCategoria(mimeType: string): CategoriaArchivo {
    for (const [categoria, mimeTypes] of Object.entries(
      MIME_TYPES_POR_CATEGORIA
    )) {
      if (mimeTypes.includes(mimeType)) {
        return categoria as CategoriaArchivo;
      }
    }
    return CategoriaArchivo.OTRO;
  }

  /**
   * Valida que el MIME type esté permitido
   */
  private validarMimeType(mimeType: string): boolean {
    return Object.values(MIME_TYPES_POR_CATEGORIA).flat().includes(mimeType);
  }

  /**
   * Genera el hash SHA-256 de un archivo
   */
  private async generarHashArchivo(filePath: string): Promise<string> {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    for await (const chunk of stream) {
      hash.update(chunk);
    }

    return hash.digest('hex');
  }

  /**
   * Genera el hash SHA-256 de una URL (para archivos externos)
   */
  private generarHashUrl(url: string): string {
    return createHash('sha256').update(url).digest('hex');
  }

  /**
   * Asegura que el directorio de uploads existe
   */
  private async asegurarDirectorioUploads(
    categoria: CategoriaArchivo
  ): Promise<string> {
    const categoriaDir = path.join(this.uploadsDir, categoria);
    await mkdir(categoriaDir, { recursive: true });
    return categoriaDir;
  }

  /**
   * Sube un archivo al servidor con deduplicación
   */
  async subirArchivo(
    file: MultipartFile,
    usuarioId: number,
    observacionId?: bigint
  ): Promise<ArchivoDetails> {
    // Validar MIME type
    if (!this.validarMimeType(file.mimetype)) {
      throw new Error(
        `Tipo de archivo no permitido: ${file.mimetype}. Tipos permitidos: ${Object.values(MIME_TYPES_POR_CATEGORIA).flat().join(', ')}`
      );
    }

    const categoria = this.determinarCategoria(file.mimetype);
    const categoriaDir = await this.asegurarDirectorioUploads(categoria);

    // Generar nombre único temporal
    const timestamp = Date.now();
    const extension = path.extname(file.filename);
    const nombreTemporal = `temp_${timestamp}${extension}`;
    const rutaTemporal = path.join(categoriaDir, nombreTemporal);

    // Guardar archivo temporalmente
    await pipeline(file.file, createWriteStream(rutaTemporal));

    // Obtener tamaño del archivo desde el archivo guardado
    const { size } = await import('node:fs/promises').then(fs =>
      fs.stat(rutaTemporal)
    );
    const tamano = BigInt(size);

    // Generar hash del contenido
    const hash = await this.generarHashArchivo(rutaTemporal);

    // Verificar si ya existe un archivo con el mismo hash (deduplicación)
    const archivoExistente = await this.prisma.archivo.findUnique({
      where: { hash },
    });

    if (archivoExistente) {
      // Eliminar el archivo temporal (ya existe)
      await unlink(rutaTemporal);

      // Si el archivo existente está vinculado a otra observación, crear un nuevo registro
      // Si no tiene observación o es la misma, retornar el existente
      if (!observacionId || archivoExistente.observacionId === observacionId) {
        return archivoExistente as ArchivoDetails;
      }

      // Crear nuevo registro apuntando al mismo archivo físico
      return (await this.prisma.archivo.create({
        data: {
          nombre: file.filename,
          tipo: file.mimetype,
          tamano,
          ruta: archivoExistente.ruta,
          url: null,
          categoria,
          hash,
          observacionId: observacionId ?? null,
          creadoPor: usuarioId,
        },
      })) as ArchivoDetails;
    }

    // Renombrar archivo con el hash
    const nombreFinal = `${hash}${extension}`;
    const rutaFinal = path.join(categoriaDir, nombreFinal);

    // Mover el archivo temporal al nombre final
    const { rename } = await import('node:fs/promises');
    await rename(rutaTemporal, rutaFinal);

    // Guardar en base de datos
    const rutaRelativa = path.relative(this.uploadsDir, rutaFinal);
    // Normalizar la ruta para usar siempre forward slashes (compatibilidad con URLs)
    const rutaNormalizada = rutaRelativa.replace(/\\/g, '/');

    return (await this.prisma.archivo.create({
      data: {
        nombre: file.filename,
        tipo: file.mimetype,
        tamano,
        ruta: rutaNormalizada,
        url: null,
        categoria,
        hash,
        observacionId: observacionId ?? null,
        creadoPor: usuarioId,
      },
    })) as ArchivoDetails;
  }

  /**
   * Guarda una URL externa sin descargar el archivo
   */
  async guardarUrlExterna(
    url: string,
    nombre: string,
    usuarioId: number,
    observacionId?: bigint
  ): Promise<ArchivoDetails> {
    // Validar URL
    try {
      new URL(url);
    } catch {
      throw new Error('URL inválida');
    }

    // Generar hash de la URL
    const hash = this.generarHashUrl(url);

    // Verificar si ya existe
    const archivoExistente = await this.prisma.archivo.findUnique({
      where: { hash },
    });

    if (archivoExistente) {
      if (!observacionId || archivoExistente.observacionId === observacionId) {
        return archivoExistente as ArchivoDetails;
      }

      // Crear nuevo registro para la misma URL
      return (await this.prisma.archivo.create({
        data: {
          nombre,
          tipo: 'text/uri-list',
          tamano: BigInt(0),
          ruta: null,
          url,
          categoria: 'otro',
          hash,
          observacionId: observacionId ?? null,
          creadoPor: usuarioId,
        },
      })) as ArchivoDetails;
    }

    // Guardar nueva URL
    return (await this.prisma.archivo.create({
      data: {
        nombre,
        tipo: 'text/uri-list',
        tamano: BigInt(0),
        ruta: null,
        url,
        categoria: 'otro',
        hash,
        observacionId: observacionId ?? null,
        creadoPor: usuarioId,
      },
    })) as ArchivoDetails;
  }

  /**
   * Obtiene información de un archivo
   */
  async obtenerArchivo(id: bigint): Promise<ArchivoDetails | null> {
    return (await this.prisma.archivo.findUnique({
      where: { id },
    })) as ArchivoDetails | null;
  }

  /**
   * Obtiene todos los archivos de una observación
   */
  async obtenerArchivosPorObservacion(
    observacionId: bigint
  ): Promise<ArchivoDetails[]> {
    return (await this.prisma.archivo.findMany({
      where: { observacionId },
      orderBy: { creadoEn: 'desc' },
    })) as ArchivoDetails[];
  }

  /**
   * Verifica si un archivo existe físicamente
   */
  async verificarArchivoExiste(ruta: string): Promise<boolean> {
    try {
      const rutaCompleta = path.join(this.uploadsDir, ruta);
      await access(rutaCompleta);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Elimina un archivo (solo el registro, no el archivo físico por deduplicación)
   */
  async eliminarArchivo(id: bigint, _usuarioId: number): Promise<void> {
    const archivo = await this.prisma.archivo.findUnique({
      where: { id },
    });

    if (!archivo) {
      throw new Error('Archivo no encontrado');
    }

    // Verificar cuántos registros apuntan al mismo archivo físico
    if (archivo.ruta) {
      const archivosCompartidos = await this.prisma.archivo.count({
        where: { hash: archivo.hash },
      });

      // Solo eliminar el archivo físico si es el último registro
      if (archivosCompartidos === 1) {
        try {
          const rutaCompleta = path.join(this.uploadsDir, archivo.ruta);
          await unlink(rutaCompleta);
        } catch (error) {
          // Log error pero continuar eliminando el registro
          console.error('Error al eliminar archivo físico:', error);
        }
      }
    }

    // Eliminar registro de la base de datos
    await this.prisma.archivo.delete({
      where: { id },
    });
  }

  /**
   * Actualiza información de un archivo
   */
  async actualizarArchivo(
    id: bigint,
    datos: ActualizarArchivoParams,
    usuarioId: number
  ): Promise<ArchivoDetails> {
    return (await this.prisma.archivo.update({
      where: { id },
      data: {
        ...datos,
        actualizadoPor: usuarioId,
        actualizadoEn: new Date(),
      },
    })) as ArchivoDetails;
  }

  /**
   * Lista archivos con paginación
   */
  async listarArchivos(
    params: ListarArchivosParams
  ): Promise<{ archivos: ArchivoDetails[]; total: number }> {
    const { categoria, observacionId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: {
      categoria?: CategoriaArchivo;
      observacionId?: bigint;
    } = {};
    if (categoria !== undefined) where.categoria = categoria;
    if (observacionId !== undefined) where.observacionId = observacionId;

    const [archivos, total] = await Promise.all([
      this.prisma.archivo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { creadoEn: 'desc' },
      }),
      this.prisma.archivo.count({ where }),
    ]);

    return { archivos: archivos as ArchivoDetails[], total };
  }

  /**
   * Duplica archivos físicamente con nombre incrementado si ya están vinculados a otra observación
   * Retorna los IDs de los nuevos archivos creados o los originales si no estaban vinculados
   */
  async duplicarArchivosParaObservacion(
    archivosIds: number[],
    observacionId: bigint,
    usuarioId: number,
    prismaClient?: PrismaClient
  ): Promise<number[]> {
    const client = prismaClient || this.prisma;
    const archivosNuevos: number[] = [];

    for (const archivoId of archivosIds) {
      const archivo = await client.archivo.findUnique({
        where: { id: archivoId },
      });

      if (!archivo) {
        throw new Error(`Archivo ${archivoId} no encontrado`);
      }

      // Si el archivo ya está vinculado a otra observación, duplicarlo
      if (
        archivo.observacionId !== null &&
        archivo.observacionId !== observacionId
      ) {
        // Generar nuevo nombre con sufijo numérico
        const nuevoNombre = await this.generarNombreIncrementado(
          archivo.nombre,
          client
        );

        // Si es un archivo físico, copiarlo
        let nuevaRuta: string | null = null;
        let nuevoHash: string = archivo.hash;

        if (archivo.ruta) {
          // Copiar archivo físico
          const rutaOriginal = path.join(this.uploadsDir, archivo.ruta);
          const extension = path.extname(archivo.ruta);
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(7);
          const nombreArchivoNuevo = `${timestamp}_${randomSuffix}${extension}`;

          const categoria = archivo.categoria as CategoriaArchivo;
          const categoriaDir = await this.asegurarDirectorioUploads(categoria);
          const rutaNueva = path.join(categoriaDir, nombreArchivoNuevo);

          // Copiar archivo
          const { copyFile } = await import('node:fs/promises');
          await copyFile(rutaOriginal, rutaNueva);

          // Generar hash único combinando contenido + timestamp + random
          // Esto asegura que cada copia tenga un hash diferente
          nuevoHash = createHash('sha256')
            .update(archivo.hash)
            .update(timestamp.toString())
            .update(randomSuffix)
            .digest('hex');
          nuevaRuta = path.relative(this.uploadsDir, rutaNueva);
        } else if (archivo.url) {
          // Para URLs, generar hash único combinando URL + timestamp + random
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(7);
          nuevoHash = createHash('sha256')
            .update(archivo.url)
            .update(timestamp.toString())
            .update(randomSuffix)
            .digest('hex');
        }

        // Crear nuevo registro de archivo
        const archivoNuevo = await client.archivo.create({
          data: {
            nombre: nuevoNombre,
            tipo: archivo.tipo,
            tamano: archivo.tamano,
            ruta: nuevaRuta,
            url: archivo.url,
            categoria: archivo.categoria,
            hash: nuevoHash,
            observacionId,
            creadoPor: usuarioId,
          },
        });

        archivosNuevos.push(Number(archivoNuevo.id));
      } else {
        // Si no está vinculado o ya está vinculado a esta observación, solo actualizar observacionId
        await client.archivo.update({
          where: { id: archivoId },
          data: {
            observacionId,
            actualizadoPor: usuarioId,
            actualizadoEn: new Date(),
          },
        });
        archivosNuevos.push(archivoId);
      }
    }

    return archivosNuevos;
  }

  /**
   * Genera un nombre incrementado (ArchivoA → ArchivoA1 → ArchivoA2)
   */
  private async generarNombreIncrementado(
    nombreOriginal: string,
    prismaClient?: PrismaClient
  ): Promise<string> {
    const client = prismaClient || this.prisma;
    // Extraer nombre base y extensión
    const extension = path.extname(nombreOriginal);
    const nombreSinExtension = path.basename(nombreOriginal, extension);

    // Buscar archivos con nombres similares
    const archivosExistentes = await client.archivo.findMany({
      where: {
        nombre: {
          startsWith: nombreSinExtension,
        },
      },
      select: { nombre: true },
    });

    if (archivosExistentes.length === 0) {
      return nombreOriginal;
    }

    // Extraer números de los nombres existentes
    const numeros: number[] = [];
    const regex = new RegExp(
      `^${nombreSinExtension}(\\d*)${extension.replace('.', '\\.')}$`
    );

    for (const archivo of archivosExistentes) {
      const match = archivo.nombre.match(regex);
      if (match) {
        const numero = match[1] ? parseInt(match[1], 10) : 0;
        numeros.push(numero);
      }
    }

    // Encontrar el siguiente número disponible
    const maxNumero = numeros.length > 0 ? Math.max(...numeros) : 0;
    const siguienteNumero = maxNumero + 1;

    return `${nombreSinExtension}${siguienteNumero}${extension}`;
  }
}
