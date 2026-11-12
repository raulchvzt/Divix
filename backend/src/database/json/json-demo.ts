import { Logger } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Registro, tablaJson } from './json-tabla';

/**
 * OPERACIONES FICTICIAS para que pantallas como Operaciones y Estadísticas
 * se vean con información. Solo se generan si la tabla de operaciones está
 * vacía, así que nunca se mezclan con datos reales.
 *
 * No crea nada más: usa las monedas, tipos de cambio, usuarios y clientes que
 * ya existen. Genera ~2 años hacia atrás desde hoy, de lunes a sábado, de
 * 9:00 a 18:00, con TEMPORADAS realistas (más dólares en vacaciones de verano
 * y diciembre, euro en Semana Santa y verano, remesas en mayo y diciembre…) y
 * un crecimiento leve del negocio, para que el pronóstico de demanda tenga de
 * dónde aprender.
 *
 * Para no generarlas: SEED_DEMO=false en el .env.
 * Para volver a generarlas: borra data/operaciones.json y reinicia el servidor.
 */

const DIAS = 730;

/** Operaciones promedio por día hábil al inicio del periodo. */
const POR_DIA = 4;
/** Crecimiento anual del número de operaciones. */
const CRECIMIENTO_ANUAL = 0.1;

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

/** En qué cantidades se opera cada divisa. Las demás usan "otra". */
const PERFIL: Record<string, { rango: [number, number]; paso: number }> = {
  USD: { rango: [100, 1500], paso: 50 },
  EUR: { rango: [50, 900], paso: 50 },
  JPY: { rango: [5000, 80000], paso: 1000 },
  otra: { rango: [50, 800], paso: 50 },
};

// Participación de cada divisa en las operaciones (se reparte entre las que existan).
const PARTICIPACION: Record<string, number> = {
  USD: 62,
  EUR: 25,
  JPY: 4,
  otra: 9,
};

/**
 * Temporada: qué tanto se mueve cada divisa cada mes comparado con un mes normal
 * (1 = normal), de enero a diciembre. "venta" = el negocio vende la divisa
 * (el cliente la compra para viajar); "compra" = el cliente la trae a cambiar.
 */
type Temporada = { venta: number[]; compra: number[] };
const TEMPORADAS: Record<string, Temporada> = {
  USD: {
    venta: [0.85, 0.85, 1.0, 1.15, 0.95, 1.15, 1.45, 1.25, 0.85, 0.9, 1.0, 1.4],
    compra: [1.2, 0.9, 0.95, 1.0, 1.25, 1.0, 1.05, 1.0, 0.9, 0.9, 1.0, 1.35],
  },
  EUR: {
    venta: [0.7, 0.7, 0.9, 1.25, 1.0, 1.4, 1.6, 1.4, 0.9, 0.8, 0.7, 0.9],
    compra: [0.9, 0.8, 0.9, 1.1, 1.0, 1.1, 1.3, 1.4, 1.2, 0.9, 0.8, 0.9],
  },
  JPY: {
    venta: [0.8, 0.9, 1.4, 1.5, 1.0, 0.9, 1.1, 1.0, 0.9, 1.2, 1.1, 1.0],
    compra: [1.0, 1.0, 1.1, 1.2, 1.0, 0.9, 1.0, 1.0, 0.9, 1.1, 1.0, 1.0],
  },
  otra: {
    venta: [0.9, 0.9, 1.0, 1.1, 1.0, 1.1, 1.3, 1.2, 0.9, 0.9, 1.0, 1.2],
    compra: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
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
      temporada: TEMPORADAS[m.codigo] ?? TEMPORADAS.otra,
      participacion: PARTICIPACION[m.codigo] ?? PARTICIPACION.otra,
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

  const participacionTotal = divisas.reduce((t, d) => t + d.participacion, 0);
  // El tipo de cambio de hace meses no era igual al de hoy: se mueve un poco
  // mes con mes (±4%) para que los importes en pesos se vean realistas.
  const ajusteTasa = (diasAtras: number) =>
    1 - 0.04 * Math.sin(diasAtras / 150) - 0.015 * Math.sin(diasAtras / 37);

  for (let dias = DIAS - 1; dias >= 0; dias--) {
    const dia = fecha(dias, 12);
    const diaSemana = dia.getDay();
    if (diaSemana === 0) continue; // domingo cerrado
    const mes = dia.getMonth();
    const anios = (DIAS - dias) / 365;
    // Sábado trabaja menos; además cada día tiene su propia variación.
    const base =
      POR_DIA *
      (1 + CRECIMIENTO_ANUAL * anios) *
      (diaSemana === 6 ? 0.6 : 1) *
      (0.7 + azar.r() * 0.6);

    for (const d of divisas) {
      for (const tipo of ['venta', 'compra'] as const) {
        const esperado =
          base *
          (d.participacion / participacionTotal) *
          (tipo === 'venta' ? 0.55 : 0.45) *
          d.temporada[tipo][mes];
        const cuantas =
          Math.floor(esperado) + (azar.r() < esperado % 1 ? 1 : 0);

        for (let i = 0; i < cuantas; i++) {
          const momento = fecha(
            dias,
            azar.ponderado(HORAS),
            azar.entero(0, 59),
          );
          const usuario = azar.ponderado(operadores);
          const limite = aperturaAbierta.get(usuario.id) ?? Infinity;
          if (momento.getTime() > ahora || momento.getTime() >= limite)
            continue;

          const { perfil, tc, moneda } = d;
          const cantidad = new Decimal(
            Math.max(
              perfil.paso,
              Math.round(
                azar.entero(perfil.rango[0], perfil.rango[1]) / perfil.paso,
              ) * perfil.paso,
            ),
          );
          const tasaHoy = new Decimal(
            tipo === 'compra' ? tc.tipoCambioCompra : tc.tipoCambioVenta,
          );
          const tasa = tasaHoy
            .mul(ajusteTasa(dias))
            .toDecimalPlaces(tasaHoy.lt(1) ? 4 : 2);

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
