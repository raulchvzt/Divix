import { promises as fs } from 'fs';
import * as path from 'path';

export type Registro = Record<string, any>;

/** Carpeta donde viven los .json. Por defecto: <raíz del proyecto>/data */
export function directorioDatos(): string {
  return process.env.JSON_DB_PATH ?? path.join(process.cwd(), 'data');
}

const tablas = new Map<string, JsonTabla>();

/**
 * Devuelve SIEMPRE la misma instancia por tabla. Es importante: varios
 * módulos crean su propio repositorio de la misma entidad, y todos deben
 * compartir la misma cola de escritura para no pisarse entre sí.
 */
export function tablaJson(nombre: string): JsonTabla {
  let tabla = tablas.get(nombre);
  if (!tabla) {
    tabla = new JsonTabla(nombre);
    tablas.set(nombre, tabla);
  }
  return tabla;
}

export class JsonTabla {
  private cola: Promise<unknown> = Promise.resolve();

  constructor(private readonly nombre: string) {}

  private get ruta(): string {
    return path.join(directorioDatos(), `${this.nombre.toLowerCase()}.json`);
  }

  /** Lee el archivo completo. Si no existe todavía, la tabla está vacía. */
  async leer(): Promise<Registro[]> {
    try {
      const texto = await fs.readFile(this.ruta, 'utf8');
      return texto.trim() ? JSON.parse(texto) : [];
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  /**
   * Lee, modifica y guarda en un solo paso, de uno en uno: si llegan dos
   * peticiones a la vez, la segunda espera a que termine la primera.
   */
  modificar<T>(cambio: (registros: Registro[]) => T | Promise<T>): Promise<T> {
    const tarea = this.cola.then(async () => {
      const registros = await this.leer();
      const resultado = await cambio(registros);
      await this.escribir(registros);
      return resultado;
    });
    this.cola = tarea.catch(() => undefined);
    return tarea;
  }

  private async escribir(registros: Registro[]): Promise<void> {
    await fs.mkdir(directorioDatos(), { recursive: true });
    const temporal = `${this.ruta}.tmp`;
    await fs.writeFile(temporal, JSON.stringify(registros, null, 2), 'utf8');

    // En Windows, rename puede fallar un instante si un antivirus o
    // OneDrive tiene el archivo abierto: reintentamos antes de rendirnos.
    for (let intento = 0; intento < 5; intento++) {
      try {
        await fs.rename(temporal, this.ruta);
        return;
      } catch (error: any) {
        if (!['EPERM', 'EBUSY', 'EACCES'].includes(error.code)) throw error;
        await new Promise((resolver) => setTimeout(resolver, 50 * (intento + 1)));
      }
    }
    await fs.copyFile(temporal, this.ruta);
    await fs.rm(temporal, { force: true });
  }
}
