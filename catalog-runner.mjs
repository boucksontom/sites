const cliMode = process.argv[2];
const requestedMode = process.env.SITES_CATALOG_MODE ?? cliMode ?? 'publish';

if (requestedMode === 'watch') {
  await import('./watch-catalog-data.mjs');
} else if (requestedMode === 'publish') {
  await import('./generate-catalog-data.mjs');
} else {
  console.error(`[catalog] mode inconnu "${requestedMode}". Utilisez "publish" ou "watch".`);
  process.exit(1);
}
