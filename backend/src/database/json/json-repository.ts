import { FindOperator, getMetadataArgsStorage } from 'typeorm';
import { JsonTabla, Registro, tablaJson } from './json-tabla';

type Entidad = Function;

interface MetaColumna {
  propiedad: string;
  modo: string;
  opciones: any;
  esFecha: boolean;
  oculta: boolean;
}

interface MetaRelacion {
  propiedad: string;
  tipo: string;
  destino: () => Entidad;
  inversa?: string;
}

/** Lee una sola vez cada tabla durante una misma consulta. */
class CacheConsulta {
  private tablas = new Map<MetaEntidad, Promise<Registro[]>>();
  filas(meta: MetaEntidad): Promise<Registro[]> {
    let filas = this.tablas.get(meta);
    if (!filas) {
      filas = meta.tabla.leer();
      this.tablas.set(meta, filas);
    }
    return filas;
  }
}

function normalizar(valor: any, esFecha: boolean): any {
  if (valor === undefined) return null;
  if (valor instanceof Date) return valor.getTime();
  if (esFecha && valor !== null) return new Date(valor).getTime();
  return valor;
}

/** Convierte un patrón LIKE de SQL (% y _) en expresión regular. */
function patronLike(patron: string): RegExp {
  const escapado = patron
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/%/g, '.*')
    .replace(/_/g, '.');
  return new RegExp(`^${escapado}$`, 'i'); // MySQL compara sin distinguir mayúsculas
}

function evaluar(valor: any, esperado: any, col: MetaColumna): boolean {
  if (esperado instanceof FindOperator) {
    const v = normalizar(valor, col.esFecha);
    const op = (esperado as any).type as string;
    const val = (esperado as any).value;
    switch (op) {
      case 'isNull':
        return v === null;
      case 'between':
        return (
          v !== null &&
          v >= normalizar(val[0], col.esFecha) &&
          v <= normalizar(val[1], col.esFecha)
        );
      case 'like':
      case 'ilike':
        return typeof v === 'string' && patronLike(String(val)).test(v);
      case 'equal':
        return v === normalizar(val, col.esFecha);
      case 'in':
        return (val as any[]).some((x) => normalizar(x, col.esFecha) === v);
      case 'moreThan':
        return v !== null && v > normalizar(val, col.esFecha);
      case 'moreThanOrEqual':
        return v !== null && v >= normalizar(val, col.esFecha);
      case 'lessThan':
        return v !== null && v < normalizar(val, col.esFecha);
      case 'lessThanOrEqual':
        return v !== null && v <= normalizar(val, col.esFecha);
      case 'not':
        return !evaluar(valor, val, col);
      default:
        throw new Error(`El operador "${op}" no está soportado por la base JSON`);
    }
  }
  return normalizar(valor, col.esFecha) === normalizar(esperado, col.esFecha);
}

/** Lo que TypeORM sabe de una entidad (tabla, columnas, relaciones), leído de sus decoradores. */
class MetaEntidad {
  private static cache = new Map<Entidad, MetaEntidad>();

  static de(entidad: Entidad): MetaEntidad {
    let meta = MetaEntidad.cache.get(entidad);
    if (!meta) {
      meta = new MetaEntidad(entidad);
      MetaEntidad.cache.set(entidad, meta);
    }
    return meta;
  }

  readonly tabla: JsonTabla;
  readonly columnas: MetaColumna[];
  readonly relaciones: MetaRelacion[];
  readonly pk: string;

  private constructor(readonly entidad: Entidad) {
    const almacen = getMetadataArgsStorage();
    const definicion = almacen.tables.find((t) => t.target === entidad);
    if (!definicion?.name) {
      throw new Error(`${entidad.name} necesita @Entity('nombre_de_tabla')`);
    }
    this.tabla = tablaJson(definicion.name);

    this.columnas = almacen.columns
      .filter((c) => c.target === entidad)
      .map((c) => ({
        propiedad: c.propertyName,
        modo: c.mode,
        opciones: c.options,
        esFecha:
          ['createDate', 'updateDate'].includes(c.mode) ||
          ['datetime', 'timestamp', 'date'].includes(String(c.options.type)),
        oculta: c.options.select === false,
      }));

    this.pk = this.columnas.find((c) => c.opciones.primary)?.propiedad ?? 'id';

    const sonda = new Proxy({}, { get: (_, nombre) => nombre });
    this.relaciones = almacen.relations
      .filter((r) => r.target === entidad)
      .map((r) => ({
        propiedad: r.propertyName,
        tipo: r.relationType,
        destino: () => (r.type as () => Entidad)(),
        inversa:
          typeof r.inverseSideProperty === 'function'
            ? String((r.inverseSideProperty as any)(sonda))
            : r.inverseSideProperty,
      }));
  }

  /** Registro guardado en el archivo -> objeto como lo devolvería TypeORM. */
  aObjeto(reg: Registro, incluirOcultas: boolean): any {
    const objeto: any = {};
    for (const col of this.columnas) {
      if (col.oculta && !incluirOcultas) continue;
      const valor = reg[col.propiedad];
      if (valor === undefined || valor === null) {
        objeto[col.propiedad] = null;
      } else {
        objeto[col.propiedad] = col.esFecha ? new Date(valor) : valor;
      }
    }
    return objeto;
  }

  async coincide(reg: Registro, donde: any, cache: CacheConsulta): Promise<boolean> {
    if (Array.isArray(donde)) {
      for (const alternativa of donde) {
        if (await this.coincide(reg, alternativa, cache)) return true;
      }
      return false;
    }
    if (!donde) return true;

    for (const [clave, esperado] of Object.entries(donde)) {
      if (esperado === undefined) continue;

      const relacion = this.relaciones.find((r) => r.propiedad === clave);
      if (relacion) {
        if (relacion.tipo !== 'many-to-one') {
          throw new Error(
            `Filtrar por la relación "${clave}" (${relacion.tipo}) no está soportado por la base JSON`,
          );
        }
        const idGuardado = reg[`${clave}Id`] ?? null;
        if (esperado === null) {
          if (idGuardado !== null) return false;
          continue;
        }
        if (idGuardado === null) return false;

        const destino = MetaEntidad.de(relacion.destino());
        const filtro = esperado as Record<string, any>;
        const soloId = Object.keys(filtro).length === 1 && filtro[destino.pk] !== undefined;
        if (soloId && typeof filtro[destino.pk] !== 'object') {
          if (idGuardado !== filtro[destino.pk]) return false;
          continue;
        }
        const filas = await cache.filas(destino);
        const fila = filas.find((f) => f[destino.pk] === idGuardado);
        if (!fila || !(await destino.coincide(fila, filtro, cache))) return false;
        continue;
      }

      const col = this.columnas.find((c) => c.propiedad === clave);
      if (!col) {
        throw new Error(`${this.entidad.name} no tiene la propiedad "${clave}"`);
      }
      if (!evaluar(reg[clave], esperado, col)) return false;
    }
    return true;
  }

  ordenar(registros: Registro[], orden?: Record<string, string>): Registro[] {
    const criterios = Object.entries(orden ?? {});
    if (criterios.length === 0) return registros;
    return [...registros].sort((a, b) => {
      for (const [propiedad, direccion] of criterios) {
        const col = this.columnas.find((c) => c.propiedad === propiedad);
        const esFecha = col?.esFecha ?? false;
        const va = normalizar(a[propiedad], esFecha);
        const vb = normalizar(b[propiedad], esFecha);
        if (va === vb) continue;
        const comparacion = va === null ? -1 : vb === null ? 1 : va < vb ? -1 : 1;
        return String(direccion).toUpperCase() === 'DESC' ? -comparacion : comparacion;
      }
      return 0;
    });
  }

  async cargarRelaciones(
    pares: { reg: Registro; obj: any }[],
    relaciones: any,
    cache: CacheConsulta,
  ): Promise<void> {
    const pedidas: Record<string, any> = Array.isArray(relaciones)
      ? Object.fromEntries(relaciones.map((r: string) => [r, true]))
      : (relaciones ?? {});

    for (const [propiedad, pedir] of Object.entries(pedidas)) {
      if (!pedir) continue;
      if (typeof pedir === 'object') {
        throw new Error('Las relaciones anidadas no están soportadas por la base JSON');
      }
      const relacion = this.relaciones.find((r) => r.propiedad === propiedad);
      if (!relacion) {
        throw new Error(`${this.entidad.name} no tiene la relación "${propiedad}"`);
      }
      const destino = MetaEntidad.de(relacion.destino());
      const filas = await cache.filas(destino);

      for (const par of pares) {
        if (relacion.tipo === 'many-to-one') {
          const id = par.reg[`${propiedad}Id`] ?? null;
          const fila = id === null ? undefined : filas.find((f) => f[destino.pk] === id);
          par.obj[propiedad] = fila ? destino.aObjeto(fila, false) : null;
        } else if (relacion.tipo === 'one-to-many') {
          if (!relacion.inversa) {
            throw new Error(`La relación "${propiedad}" necesita su lado inverso para cargarse`);
          }
          par.obj[propiedad] = filas
            .filter((f) => f[`${relacion.inversa}Id`] === par.reg[this.pk])
            .map((f) => destino.aObjeto(f, false));
        } else {
          throw new Error(`Relaciones ${relacion.tipo} no soportadas por la base JSON`);
        }
      }
    }
  }
}

/**
 * Sustituto temporal de Repository<T> de TypeORM, respaldado por archivos JSON.
 * Solo implementa lo que usan los services del proyecto. Pensado para
 * desarrollo y pruebas: NO usar en producción.
 */
export class JsonRepository<T = any> {
  private readonly meta: MetaEntidad;

  constructor(entidad: Entidad) {
    this.meta = MetaEntidad.de(entidad);
  }

  create(datos: any = {}): T {
    return { ...datos } as T;
  }

  async find(opciones: any = {}): Promise<T[]> {
    return (await this.consultar(opciones)).items;
  }

  async findOne(opciones: any = {}): Promise<T | null> {
    const { items } = await this.consultar({ ...opciones, take: 1 });
    return items[0] ?? null;
  }

  async findAndCount(opciones: any = {}): Promise<[T[], number]> {
    const { items, total } = await this.consultar(opciones);
    return [items, total];
  }

  async save(entidad: any): Promise<T> {
    const meta = this.meta;
    return meta.tabla.modificar((registros) => {
      const ahora = new Date();
      const idRecibido = entidad[meta.pk];
      let reg =
        idRecibido != null ? registros.find((r) => r[meta.pk] === idRecibido) : undefined;

      if (!reg) {
        reg = {};
        reg[meta.pk] =
          idRecibido ?? registros.reduce((max, r) => Math.max(max, r[meta.pk] ?? 0), 0) + 1;
        for (const col of meta.columnas) {
          if (col.modo === 'createDate') reg[col.propiedad] = ahora.toISOString();
          else if (col.opciones.default !== undefined && typeof col.opciones.default !== 'function') {
            reg[col.propiedad] = col.opciones.default;
          }
        }
        registros.push(reg);
      }

      // Solo se sobrescribe lo que viene definido (igual que TypeORM):
      // así guardar un usuario cargado sin su hash no borra el hash.
      for (const col of meta.columnas) {
        if (col.propiedad === meta.pk || col.modo === 'createDate') continue;
        if (col.modo === 'updateDate') {
          reg[col.propiedad] = ahora.toISOString();
          continue;
        }
        const valor = entidad[col.propiedad];
        if (valor === undefined) continue;
        reg[col.propiedad] = valor instanceof Date ? valor.toISOString() : valor;
      }
      for (const rel of meta.relaciones) {
        if (rel.tipo !== 'many-to-one') continue;
        const valor = entidad[rel.propiedad];
        if (valor === undefined) continue;
        reg[`${rel.propiedad}Id`] = valor === null ? null : valor[MetaEntidad.de(rel.destino()).pk];
      }

      // Refleja en la entidad lo que genera la base (id, fechas, valores por defecto)
      entidad[meta.pk] = reg[meta.pk];
      for (const col of meta.columnas) {
        if (col.modo === 'createDate' || col.modo === 'updateDate') {
          entidad[col.propiedad] = new Date(reg[col.propiedad]);
        } else if (entidad[col.propiedad] === undefined && reg[col.propiedad] !== undefined) {
          entidad[col.propiedad] = reg[col.propiedad];
        }
      }
      return entidad as T;
    });
  }

  /**
   * Mini QueryBuilder: solo entiende lo que usan auth/usuarios
   * (addSelect, leftJoinAndSelect, where/andWhere con "alias.campo = :param", getOne/getMany).
   */
  createQueryBuilder(_alias?: string): any {
    const filtros: Record<string, any> = {};
    const relaciones: Record<string, boolean> = {};
    let incluirOcultas = false;

    const agregarCondicion = (condicion: string, parametros: Record<string, any> = {}) => {
      const m = /^\s*\w+\.(\w+)\s*=\s*(:\w+|true|false|-?\d+(?:\.\d+)?)\s*$/i.exec(condicion);
      if (!m) {
        throw new Error(`Condición no soportada por la base JSON: "${condicion}"`);
      }
      const [, propiedad, valor] = m;
      const minuscula = valor.toLowerCase();
      filtros[propiedad] = valor.startsWith(':')
        ? parametros[valor.slice(1)]
        : minuscula === 'true'
          ? true
          : minuscula === 'false'
            ? false
            : Number(valor);
    };

    const qb: any = {
      addSelect: () => {
        incluirOcultas = true;
        return qb;
      },
      leftJoinAndSelect: (relacion: string) => {
        relaciones[relacion.split('.')[1]] = true;
        return qb;
      },
      where: (condicion: string, parametros?: Record<string, any>) => {
        agregarCondicion(condicion, parametros);
        return qb;
      },
      andWhere: (condicion: string, parametros?: Record<string, any>) => {
        agregarCondicion(condicion, parametros);
        return qb;
      },
      getOne: async () => {
        const { items } = await this.consultar(
          { where: filtros, relations: relaciones, take: 1 },
          incluirOcultas,
        );
        return items[0] ?? null;
      },
      getMany: async () => {
        const { items } = await this.consultar(
          { where: filtros, relations: relaciones },
          incluirOcultas,
        );
        return items;
      },
    };
    return qb;
  }

  private async consultar(
    opciones: any,
    incluirOcultas = false,
  ): Promise<{ items: any[]; total: number }> {
    const cache = new CacheConsulta();
    const todos = await this.meta.tabla.leer();

    const coincidentes: Registro[] = [];
    for (const reg of todos) {
      if (await this.meta.coincide(reg, opciones.where, cache)) coincidentes.push(reg);
    }

    const ordenados = this.meta.ordenar(coincidentes, opciones.order);
    const desde = opciones.skip ?? 0;
    const hasta = opciones.take != null ? desde + opciones.take : undefined;
    const pares = ordenados.slice(desde, hasta).map((reg) => ({
      reg,
      obj: this.meta.aObjeto(reg, incluirOcultas),
    }));

    await this.meta.cargarRelaciones(pares, opciones.relations, cache);
    return { items: pares.map((p) => p.obj), total: ordenados.length };
  }
}
