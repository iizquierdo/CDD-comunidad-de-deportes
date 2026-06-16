import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(here, '..');
const repoRoot = path.resolve(apiRoot, '..', '..');

// Load env from repo root first, then allow apps/api/.env to override.
dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config({ path: path.join(apiRoot, '.env'), override: true });

const { default: app } = await import('./server');

// Railway (y la mayoría de los PaaS) inyectan PORT — usarlo primero. En local
// caemos a API_PORT (.env) o al default. Prioriza PORT para evitar mismatches
// que devuelven 502 cuando el proxy no encuentra la app en el puerto esperado.
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 14000);
const host = process.env.API_HOST ?? '0.0.0.0';

app.listen(port, host, () => {
  console.log(`[api] listening on http://${host}:${port}`);
});
