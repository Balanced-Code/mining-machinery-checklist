import { existsSync } from 'fs';
import { readdir, readFile, writeFile } from 'fs/promises';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');

async function addExtensions(dir) {
  const files = await readdir(dir, { withFileTypes: true });

  for (const file of files) {
    const filePath = join(dir, file.name);

    if (file.isDirectory()) {
      await addExtensions(filePath);
    } else if (file.name.endsWith('.js')) {
      let content = await readFile(filePath, 'utf-8');

      // Función para convertir alias @/ a ruta relativa
      const resolveAliasPath = (fromFile, aliasPath) => {
        // Convertir @/ a ruta absoluta dentro de dist
        const absolutePath = join(distDir, aliasPath.replace(/^@\//, ''));

        // Calcular ruta relativa desde el archivo actual
        let relativePath = relative(dirname(fromFile), absolutePath);

        // Normalizar separadores a forward slashes
        relativePath = relativePath.replace(/\\/g, '/');

        // Asegurar que empiece con ./
        if (!relativePath.startsWith('.')) {
          relativePath = './' + relativePath;
        }

        // Agregar extensión si no la tiene
        if (!relativePath.endsWith('.js') && !relativePath.endsWith('.json')) {
          if (existsSync(absolutePath + '.js')) {
            relativePath += '.js';
          } else if (existsSync(join(absolutePath, 'index.js'))) {
            relativePath += '/index.js';
          } else {
            relativePath += '.js';
          }
        }

        return relativePath;
      };

      // Función para resolver la ruta correcta con extensión
      const resolveImportPath = (basePath, importPath) => {
        if (!importPath.startsWith('.')) return importPath;

        const fullPath = resolve(dirname(basePath), importPath);

        // Si ya tiene extensión, déjalo como está
        if (importPath.endsWith('.js') || importPath.endsWith('.json')) {
          return importPath;
        }

        // Verificar si existe como archivo .js
        if (existsSync(fullPath + '.js')) {
          return importPath + '.js';
        }

        // Verificar si es un directorio con index.js
        if (existsSync(join(fullPath, 'index.js'))) {
          return importPath + '/index.js';
        }

        // Por defecto, agregar .js
        return importPath + '.js';
      };

      // Reemplazar imports con alias @/ (antes de los relativos)
      content = content.replace(/from ['"](@\/[^'"]+)['"];/g, (match, path) => {
        const newPath = resolveAliasPath(filePath, path);
        return `from '${newPath}';`;
      });

      content = content.replace(
        /import ['"](@\/[^'"]+)['"];/g,
        (match, path) => {
          const newPath = resolveAliasPath(filePath, path);
          return `import '${newPath}';`;
        }
      );

      // Reemplazar imports relativos sin extensión
      content = content.replace(/from ['"](\.[^'"]+)['"];/g, (match, path) => {
        const newPath = resolveImportPath(filePath, path);
        return `from '${newPath}';`;
      });

      // Reemplazar imports solo con 'xxx' (sin from)
      content = content.replace(
        /import ['"](\.[^'"]+)['"];/g,
        (match, path) => {
          const newPath = resolveImportPath(filePath, path);
          return `import '${newPath}';`;
        }
      );

      await writeFile(filePath, content, 'utf-8');
    }
  }
}

console.log('Adding .js extensions to imports...');
await addExtensions(distDir);
console.log('Done!');
