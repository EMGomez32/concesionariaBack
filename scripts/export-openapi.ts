/**
 * Exporta el OpenAPI spec del backend a un archivo JSON.
 *
 * Uso:
 *   npm run openapi:export
 *
 * El JSON queda en `openapi.json` (gitignored). El frontend lo consume con
 * `openapi-typescript` para generar tipos compartidos en `types/api.generated.ts`.
 *
 * Workflow recomendado:
 *   1. Back: agregar/cambiar `@openapi` doc en una ruta.
 *   2. `npm run openapi:export` (back)
 *   3. Copiar `BackConcesionaria/openapi.json` al front.
 *   4. Front: `npm run openapi:gen`
 *   5. Los types nuevos están en `src/types/api.generated.ts`.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Setear defaults dummy para que el import de config no rompa al
// generar el spec (no necesitamos DATABASE_URL real, solo el OpenAPI doc).
process.env.DATABASE_URL ||= 'postgresql://dummy:dummy@localhost:5432/dummy';
process.env.JWT_SECRET ||= 'x'.repeat(40);
process.env.JWT_REFRESH_SECRET ||= 'y'.repeat(40);

import { writeFileSync } from 'fs';
import { resolve } from 'path';

const swaggerSpecs = require('../src/config/swagger').default;

const out = resolve(__dirname, '..', 'openapi.json');
writeFileSync(out, JSON.stringify(swaggerSpecs, null, 2));
console.log(`✓ OpenAPI spec exportado a ${out}`);
