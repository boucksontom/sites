import { watch } from 'node:fs';
import path from 'node:path';
import { rootDir, writeCatalogData } from './catalog-tools.mjs';

let debounceTimer = null;
let isWriting = false;
let pendingRun = false;

function shouldIgnore(relativePath) {
  if (!relativePath) return true;
  const normalizedPath = relativePath.split(path.sep).join('/');

  return (
    normalizedPath.startsWith('.') ||
    normalizedPath.includes('/.') ||
    normalizedPath === 'catalog-data.js' ||
    normalizedPath === 'catalog-tools.mjs' ||
    normalizedPath === 'generate-catalog-data.mjs' ||
    normalizedPath === 'watch-catalog-data.mjs' ||
    normalizedPath === 'index.html'
  );
}

async function regenerate(reason) {
  if (isWriting) {
    pendingRun = true;
    return;
  }

  isWriting = true;

  try {
    const paths = await writeCatalogData();
    console.log(`[catalog] mis à jour (${paths.length} fichier(s)) après ${reason}`);
  } catch (error) {
    console.error(`[catalog] échec de mise à jour après ${reason}:`, error);
  } finally {
    isWriting = false;

    if (pendingRun) {
      pendingRun = false;
      void regenerate('une modification en attente');
    }
  }
}

function scheduleRegeneration(reason) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void regenerate(reason);
  }, 150);
}

await regenerate('le démarrage du watcher');

const watcher = watch(rootDir, { recursive: true }, (_eventType, filename) => {
  if (!filename || shouldIgnore(filename)) return;
  scheduleRegeneration(`la modification de ${filename}`);
});

watcher.on('error', (error) => {
  console.error('[catalog] erreur du watcher:', error);
});

process.on('SIGINT', () => {
  watcher.close();
  if (debounceTimer) clearTimeout(debounceTimer);
  console.log('\n[catalog] watcher arrêté.');
  process.exit(0);
});

console.log('[catalog] watcher actif. Ctrl+C pour arrêter.');

export {};
