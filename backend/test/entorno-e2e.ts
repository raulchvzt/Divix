// Se ejecuta ANTES de cargar la app en cada archivo de pruebas e2e (setupFiles).
// Deja listo un entorno aislado: base JSON nueva en una carpeta temporal del
// sistema, sin MySQL y sin tocar backend/data.
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const carpeta = mkdtempSync(join(tmpdir(), 'divix-e2e-'));

process.env.DB_DRIVER = 'json';
process.env.JSON_DB_PATH = carpeta;
process.env.JWT_SECRET = 'secreto-solo-para-pruebas';
process.env.SEED_PASSWORD = 'Prueba12345';
process.env.SEED_DEMO = 'false';
process.env.REFERENCIA_MERCADO = 'off';
process.env.NODE_ENV = 'test';
