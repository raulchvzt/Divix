import { Logger } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Registro, tablaJson } from './json-tabla';

/**
 * OPERACIONES FICTICIAS para que pantallas como Operaciones y Estadísticas
 * se vean con información. Solo se generan si la tabla de operaciones está
 * vacía, así que nunca se mezclan con datos reales.
 *
 * No crea nada más: usa las monedas, tipos de cambio, usuarios y clientes que
 * ya existen. Genera ~30 días hacia atrás desde hoy, de lunes a sábado, de
 * 9:00 a 18:00.
 *
 * Para no generarlas: SEED_DEMO=false en el .env.
 * Para volver a generarlas: borra data/operaciones.json y reinicia el servidor.
 */

const DIAS = 30;

/** Generador pseudoaleatorio con semilla: los datos salen parecidos en cada instalación. */
function aleatorio(semilla: number) {
  let s = semilla >>> 0;
  const r = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const entero = (min: number, max: number) =>
    min + Math.floor(r() * (max - min + 1));
  const elegir = <T>(lista: T[]) => lista[entero(0, lista.length - 1)];
  const ponderado = <T>(opciones: [T, number][]): T => {
    let x = r() * opciones.reduce((s, [, p]) => s + p, 0);
    for (const [valor, peso] of opciones) {
      x -= peso;
      if (x <= 0) return valor;
    }
    return opciones[opciones.length - 1][0];
  };
  return { r, entero, elegir, ponderado };
}

/** Qué tan seguido se opera cada divisa y en qué cantidades. Las demás usan "otra". */
const PERFIL: Record<
  string,
  { peso: number; rango: [number, number]; paso: number }
> = {
  USD: { peso: 60, rango: [100, 1500], paso: 50 },
  EUR: { peso: 25, rango: [50, 900], paso: 50 },
  JPY: { peso: 4, rango: [5000, 80000], paso: 1000 },
  otra: { peso: 8, rango: [50, 800], paso: 50 },
};

const HORAS: [number, number][] = [
  [9, 2],
  [10, 4],
  [11, 6],
  [12, 7],
  [13, 6],
  [14, 4],
  [15, 5],
  [16, 5],
  [17, 3],
];

const fecha = (diasAtras: number, hora: number, minuto = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  d.setHours(hora, minuto, 0, 0);
  return d;
};

const fijo = (v: Decimal.Value) => new Decimal(v).toFixed(4);

export async function sembrarOperacionesDemo(log: Logger) {
  if (process.env.SEED_DEMO?.toLowerCase() === 'false') return;

  const tablaOperaciones = tablaJson('Operaciones');
  if ((await tablaOperaciones.leer()).length > 0) return;

  const [monedas, tiposCambio, usuarios, roles, clientes, cortes] =
    await Promise.all(
      [
        'Monedas',
        'TiposCambio',
        'Usuarios',
        'Roles',
        'Clientes',
        'CortesCaja',
      ].map((t) => tablaJson(t).leer()),
    );

  // Tipo de cambio vigente (el más reciente) de cada moneda activa.
  const divisas = monedas
    .filter((m) => m.activo !== false)
    .map((m) => ({
      moneda: m,
      tc: tiposCambio
        .filter((t) => t.monedaId === m.id)
        .sort((a, b) =>
          String(b.fechaVigencia).localeCompare(String(a.fechaVigencia)),
        )[0],
      perfil: PERFIL[m.codigo] ?? PERFIL.otra,
    }))
    .filter((d) => d.tc);

  // Operan los cajeros; el administrador también, pero menos seguido.
  const nombreRol = (u: Registro) =>
    roles.find((r) => r.id === u.rolId)?.nombreRol;
  const operadores = usuarios
    .filter(
      (u) =>
        u.activo !== false &&
        ['cajero', 'administrador'].includes(nombreRol(u)),
    )
    .map((u) => [u, nombreRol(u) === 'cajero' ? 4 : 1] as [Registro, number]);

  if (divisas.length === 0 || operadores.length === 0) return;

  // Si un usuario tiene un corte abierto, no se le agregan operaciones después de
  // su apertura, para no alterar los saldos esperados de su caja.
  const aperturaAbierta = new Map<number, number>();
  for (const c of cortes) {
    if (!c.fechaCierre)
      aperturaAbierta.set(c.usuarioId, new Date(c.fechaApertura).getTime());
  }

  const clientesActivos = clientes.filter((c) => c.activo !== false);
  const azar = aleatorio(20261109);
  const ahora = Date.now();
  const operaciones: Registro[] = [];

  for (let dias = DIAS - 1; dias >= 0; dias--) {
    const diaSemana = fecha(dias, 12).getDay();
    if (diaSemana === 0) continue; // domingo cerrado
    const cuantas = diaSemana === 6 ? azar.entero(2, 4) : azar.entero(3, 7);

    for (let i = 0; i < cuantas; i++) {
      const momento = fecha(dias, azar.ponderado(HORAS), azar.entero(0, 59));
      const usuario = azar.ponderado(operadores);
      const limite = aperturaAbierta.get(usuario.id) ?? Infinity;
      if (momento.getTime() > ahora || momento.getTime() >= limite) continue;

      const { moneda, tc, perfil } = azar.ponderado(
        divisas.map(
          (d) => [d, d.perfil.peso] as [(typeof divisas)[number], number],
        ),
      );
      const tipo = azar.r() < 0.45 ? 'compra' : 'venta';
      const cantidad = new Decimal(
        Math.max(
          perfil.paso,
          Math.round(
            azar.entero(perfil.rango[0], perfil.rango[1]) / perfil.paso,
          ) * perfil.paso,
        ),
      );
      const tasa = new Decimal(
        tipo === 'compra' ? tc.tipoCambioCompra : tc.tipoCambioVenta,
      );

      operaciones.push({
        fechaHora: momento.toISOString(),
        tipoOperacion: tipo,
        cantidadDivisa: fijo(cantidad),
        tipoCambioAplicado: fijo(tasa),
        importeTotal: fijo(cantidad.mul(tasa)),
        clienteId: clientesActivos.length
          ? azar.elegir(clientesActivos).id
          : null,
        usuarioId: usuario.id,
        monedaId: moneda.id,
        tipoCambioId: tc.id,
      });
    }
  }

  operaciones.sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
  await tablaOperaciones.modificar((filas) => {
    if (filas.length > 0) return; // alguien registró una operación mientras tanto
    operaciones.forEach((op, i) => filas.push({ id: i + 1, ...op }));
  });

  log.warn(
    `Se generaron ${operaciones.length} operaciones DEMO de los últimos ${DIAS} días. ` +
      `Desactívalo con SEED_DEMO=false.`,
  );
}
