import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const rootDir = path.dirname(fileURLToPath(import.meta.url));
export const outputFile = path.join(rootDir, 'catalog-data.js');

const excludedRootFiles = new Set([
  'catalog-data.js',
  'catalog-runner.mjs',
  'catalog-tools.mjs',
  'generate-catalog-data.mjs',
  'index.html',
  'package.json',
  'publish-site.mjs',
  'watch-catalog-data.mjs'
]);

async function collectPaths(directory) {
  const dirents = await readdir(directory, { withFileTypes: true });
  const visibleDirents = dirents
    .filter((dirent) => !dirent.name.startsWith('.'))
    .sort((left, right) => left.name.localeCompare(right.name, 'fr', { numeric: true, sensitivity: 'base' }));

  const paths = [];

  for (const dirent of visibleDirents) {
    const absolutePath = path.join(directory, dirent.name);
    const relativePath = path.relative(rootDir, absolutePath).split(path.sep).join('/');

    if (dirent.isDirectory()) {
      paths.push(...await collectPaths(absolutePath));
      continue;
    }

    if (!dirent.isFile()) continue;
    if (!relativePath.includes('/') && excludedRootFiles.has(relativePath)) continue;

    paths.push(relativePath);
  }

  return paths;
}

export async function buildCatalogPaths() {
  return collectPaths(rootDir);
}

export async function writeCatalogData() {
  const paths = await buildCatalogPaths();
  const output = `window.SITES_CATALOG_PATHS = ${JSON.stringify(paths, null, 2)};\n`;
  await writeFile(outputFile, output, 'utf8');
  return paths;
}
