import { writeCatalogData } from './catalog-tools.mjs';

const paths = await writeCatalogData();
console.log(`catalog-data.js mis à jour avec ${paths.length} fichier(s).`);
