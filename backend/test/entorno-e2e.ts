import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Las pruebas e2e corren contra una base JSON nueva en una carpeta temporal,
// así nunca tocan backend/data ni una base MySQL. Estas variables se ponen
// antes de cargar la app (y tienen prioridad sobre el .env).
process.env.DB_DRIVER = 'json';
process.env.JSON_DB_PATH = mkdtempSync(join(tmpdir(), 'divix-e2e-'));
process.env.JWT_SECRET = 'secreto-de-pruebas';
process.env.SEED_PASSWORD = 'Prueba12345';
process.env.SEED_DEMO = 'false';
process.env.REFERENCIA_MERCADO = 'off';
