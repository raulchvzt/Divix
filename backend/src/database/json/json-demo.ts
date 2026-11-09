import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import Decimal from 'decimal.js';
import { Rol } from '../../entities/rol.entity';
import { Usuario } from '../../entities/usuario.entity';
import { Moneda } from '../../entities/moneda.entity';
import { Cliente } from '../../entities/cliente.entity';
import { JsonRepository } from './json-repository';
import { Registro, tablaJson } from './json-tabla';

/**
 * DATOS FICTICIOS para ver la aplicación funcionando (pantallas de Operaciones,
 * Estadísticas, Caja, etc.). Solo se generan si la tabla de operaciones está
 * vacía, así que nunca se mezclan con datos reales.
 *
 * Genera ~30 días hacia atrás desde hoy:
 *  - monedas extra (CAD, GBP, JPY, CHF) e historial semanal de tipos de cambio
 *  - 2 cajeros más y una lista corta de clientes
 *  - operaciones de lunes a sábado, de 9:00 a 18:00
 *  - un corte de caja por cajero y día (cerrados; los de hoy quedan abiertos)
 *
 * Para no generarlos: SEED_DEMO=false en el .env.
 * Para volver a generarlos: borra data/operaciones.json, data/cortescaja.json
 * y data/movimientoscaja.json y reinicia el servidor.
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
  const ponderado = <T>(opciones: [T, number][]): T => {
    let x = r() * opciones.reduce((s, [, p]) => s + p, 0);
    for (const [valor, peso] of opciones) {
      x -= peso;
      if (x <= 0) return valor;
    }
    return opciones[opciones.length - 1][0];
  };
  return { r, entero, ponderado };
}

interface DivisaDemo {
  codigo: string;
  nombre: string;
  simbolo: string;
  compra: number;
  venta: number;
  peso: number; // qué tan seguido se opera
  rango: [number, number]; // cantidad típica por operación
  paso: number; // las cantidades se redondean a este múltiplo
  saldoInicial: number; // existencia con la que abre cada cajero el primer día
}

const DIVISAS: DivisaDemo[] = [
  {
    codigo: 'USD',
    nombre: 'Dólar estadounidense',
    simbolo: '$',
    compra: 17.5,
    venta: 18.2,
    peso: 55,
    rango: [100, 1500],
    paso: 50,
    saldoInicial: 6000,
  },
  {
    codigo: 'EUR',
    nombre: 'Euro',
    simbolo: '€',
    compra: 19.0,
    venta: 19.9,
    peso: 20,
    rango: [50, 900],
    paso: 50,
    saldoInicial: 3000,
  },
  {
    codigo: 'CAD',
    nombre: 'Dólar canadiense',
    simbolo: '$',
    compra: 12.6,
    venta: 13.3,
    peso: 10,
    rango: [100, 1000],
    paso: 50,
    saldoInicial: 2000,
  },
  {
    codigo: 'GBP',
    nombre: 'Libra esterlina',
    simbolo: '£',
    compra: 22.9,
    venta: 23.9,
    peso: 7,
    rango: [50, 500],
    paso: 10,
    saldoInicial: 1000,
  },
  {
    codigo: 'JPY',
    nombre: 'Yen japonés',
    simbolo: '¥',
    compra: 0.112,
    venta: 0.121,
    peso: 4,
    rango: [5000, 80000],
    paso: 1000,
    saldoInicial: 200000,
  },
  {
    codigo: 'CHF',
    nombre: 'Franco suizo',
    simbolo: 'Fr',
    compra: 20.7,
    venta: 21.7,
    peso: 4,
    rango: [50, 400],
    paso: 10,
    saldoInicial: 800,
  },
];

const CAJEROS_EXTRA = [
  { usuario: 'cajero2', nombre: 'María Fernanda', apellidoPaterno: 'Ríos' },
  { usuario: 'cajero3', nombre: 'Jorge', apellidoPaterno: 'Méndez' },
];

const CLIENTES = [
  ['Cliente', 'General', null, 'CLIENTE-GENERAL'],
  ['Laura', 'Hernández', 'Soto', 'INE-HESL850312'],
  ['Carlos', 'Ramírez', 'Torres', 'INE-RATC790521'],
  ['Ana Sofía', 'Gutiérrez', 'Luna', 'PAS-G4829173'],
  ['Miguel', 'Ortega', 'Vázquez', 'INE-ORVM910807'],
  ['Patricia', 'Morales', 'Cruz', 'INE-MOCP880214'],
  ['Roberto', 'Silva', 'Navarro', 'PAS-S1938475'],
  ['Daniela', 'Flores', 'Aguilar', 'INE-FLAD950630'],
  ['Héctor', 'Castillo', 'Reyes', 'INE-CARH820119'],
  ['Valeria', 'Jiménez', 'Peña', 'INE-JIPV970925'],
] as const;

const fecha = (diasAtras: number, hora: number, minuto = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  d.setHours(hora, minuto, 0, 0);
  return d;
};

const siguienteId = (filas: Registro[]) =>
  filas.reduce((m, f) => Math.max(m, f.id ?? 0), 0) + 1;
const fijo = (v: Decimal.Value) => new Decimal(v).toFixed(4);

export async function sembrarDatosDemo(log: Logger) {
  if (process.env.SEED_DEMO?.toLowerCase() === 'false') return;

  const tablaOperaciones = tablaJson('Operaciones');
  if ((await tablaOperaciones.leer()).length > 0) return;

  const azar = aleatorio(20261109);
  const roles = new JsonRepository<Rol>(Rol);
  const usuarios = new JsonRepository<Usuario>(Usuario);
  const monedas = new JsonRepository<Moneda>(Moneda);
  const clientes = new JsonRepository<Cliente>(Cliente);

  // ---------- usuarios ----------
  const admin = await usuarios.findOne({ where: { usuario: 'admin' } });
  const rolCajero = await roles.findOne({ where: { nombreRol: 'cajero' } });
  if (!admin || !rolCajero) return; // la siembra base todavía no corre

  const contrasena = process.env.SEED_PASSWORD ?? 'Divix12345';
  for (const c of CAJEROS_EXTRA) {
    if (await usuarios.findOne({ where: { usuario: c.usuario } })) continue;
    await usuarios.save(
      usuarios.create({
        ...c,
        correo: `${c.usuario}@divix.mx`,
        contrasenaHash: await bcrypt.hash(contrasena, 10),
        rol: { id: rolCajero.id },
      }),
    );
  }
  const cajeros = await usuarios.find({
    where: { rol: { id: rolCajero.id }, activo: true },
  });

  // ---------- clientes ----------
  for (const [
    nombre,
    apellidoPaterno,
    apellidoMaterno,
    identificacion,
  ] of CLIENTES) {
    if (await clientes.findOne({ where: { identificacion } })) continue;
    await clientes.save(
      clientes.create({
        nombre,
        apellidoPaterno,
        apellidoMaterno: apellidoMaterno ?? undefined,
        identificacion,
      }),
    );
  }
  const listaClientes = await clientes.find({ where: { activo: true } });
  const clienteGeneral = listaClientes.find(
    (c) => c.identificacion === 'CLIENTE-GENERAL',
  )!;
  const clientesConNombre = listaClientes.filter(
    (c) => c.id !== clienteGeneral.id,
  );

  // ---------- monedas ----------
  const idMoneda: Record<string, number> = {};
  for (const d of DIVISAS) {
    const existente = await monedas.findOne({ where: { codigo: d.codigo } });
    const m =
      existente ??
      (await monedas.save(
        monedas.create({
          codigo: d.codigo,
          nombre: d.nombre,
          simbolo: d.simbolo,
        }),
      ));
    idMoneda[d.codigo] = m.id;
  }

  // ---------- historial de tipos de cambio (uno por semana + el de hoy) ----------
  // Se escriben directo en la tabla porque save() siempre fecha con "ahora".
  await tablaJson('TiposCambio').modificar((filas) => {
    for (const d of DIVISAS) {
      let factor = 1 - 0.015 + azar.r() * 0.01; // arranca un poco por debajo del valor actual
      for (let dias = DIAS + 1; dias >= 0; dias -= dias > 6 ? 7 : dias) {
        const esHoy = dias === 0;
        if (!esHoy) factor *= 1 + (azar.r() - 0.45) * 0.008;
        const f = esHoy ? 1 : factor;
        const decimales = d.compra < 1 ? 4 : 2;
        filas.push({
          id: siguienteId(filas),
          fechaVigencia: fecha(dias, 8, 30).toISOString(),
          tipoCambioCompra: fijo((d.compra * f).toFixed(decimales)),
          tipoCambioVenta: fijo((d.venta * f).toFixed(decimales)),
          monedaId: idMoneda[d.codigo],
          usuarioId: admin.id,
        });
        if (esHoy) break;
      }
    }
  });
  const historial: Registro[] = (await tablaJson('TiposCambio').leer()).map(
    (t) => ({
      ...t,
      vigencia: new Date(t.fechaVigencia).getTime(),
    }),
  );
  /** El tipo de cambio que el servidor habría aplicado en ese momento. */
  const vigente = (codigo: string, momento: Date) =>
    historial
      .filter(
        (t) =>
          t.monedaId === idMoneda[codigo] && t.vigencia <= momento.getTime(),
      )
      .sort((a, b) => b.vigencia - a.vigencia)[0];

  // ---------- operaciones y cortes, día por día ----------
  const ahora = new Date();
  const operaciones: Registro[] = [];
  const cortes: Registro[] = [];

  // Lo que cada cajero tiene en caja al terminar su último corte (abre así el siguiente).
  const caja = new Map<
    number,
    { mxn: Decimal; reserva: Decimal; divisas: Record<string, Decimal> }
  >();
  for (const c of cajeros) {
    caja.set(c.id, {
      mxn: new Decimal(60000),
      reserva: new Decimal(150000),
      divisas: Object.fromEntries(
        DIVISAS.map((d) => [d.codigo, new Decimal(d.saldoInicial)]),
      ),
    });
  }

  for (let dias = DIAS - 1; dias >= 0; dias--) {
    const dia = fecha(dias, 0);
    if (dia.getDay() === 0) continue; // domingo cerrado
    const esHoy = dias === 0;

    // Los sábados trabaja menos gente y hay menos movimiento.
    const turno = dia.getDay() === 6 ? cajeros.slice(0, 2) : cajeros;
    for (const cajero of turno) {
      const apertura = fecha(dias, 9, azar.entero(0, 10));
      if (apertura > ahora) continue;

      const saldo = caja.get(cajero.id)!;
      const corte: Registro = {
        id: cortes.length + 1,
        usuarioId: cajero.id,
        fechaApertura: apertura.toISOString(),
        fechaCierre: null,
        efectivoInicial: fijo(saldo.mxn),
        reservaInicial: fijo(saldo.reserva),
        saldosIniciales: Object.fromEntries(
          Object.entries(saldo.divisas).map(([k, v]) => [k, fijo(v)]),
        ),
        efectivoFinal: null,
        reservaFinal: null,
        saldosFinales: null,
        totalCompras: null,
        totalVentas: null,
        diferenciaCaja: null,
        diferencias: null,
      };

      let compras = new Decimal(0);
      let ventas = new Decimal(0);
      const cuantas =
        dia.getDay() === 6 ? azar.entero(1, 2) : azar.entero(1, 3);
      const horas = Array.from({ length: cuantas }, () =>
        azar.ponderado<number>([
          [9, 2],
          [10, 4],
          [11, 6],
          [12, 7],
          [13, 6],
          [14, 4],
          [15, 5],
          [16, 5],
          [17, 3],
        ]),
      ).sort((a, b) => a - b);

      for (const hora of horas) {
        const momento = fecha(
          dias,
          hora,
          azar.entero(apertura.getHours() === hora ? 15 : 0, 59),
        );
        if (momento > ahora) continue;

        const divisa = azar.ponderado(
          DIVISAS.map((d) => [d, d.peso] as [DivisaDemo, number]),
        );
        const tc = vigente(divisa.codigo, momento);
        if (!tc) continue;
        // Si al cajero le queda poca divisa, es más probable que compre (como en la vida real).
        const pocaDivisa = saldo.divisas[divisa.codigo].lt(
          divisa.saldoInicial * 0.6,
        );
        let tipo: 'compra' | 'venta' =
          azar.r() < (pocaDivisa ? 0.7 : 0.4) ? 'compra' : 'venta';
        const cantidad = new Decimal(
          Math.round(
            azar.entero(divisa.rango[0], divisa.rango[1]) / divisa.paso,
          ) * divisa.paso,
        );

        // Que la caja nunca quede en negativo: si no alcanza, se invierte la operación.
        const tasaCompra = new Decimal(tc.tipoCambioCompra);
        if (tipo === 'venta' && cantidad.gt(saldo.divisas[divisa.codigo]))
          tipo = 'compra';
        if (tipo === 'compra' && cantidad.mul(tasaCompra).gt(saldo.mxn))
          tipo = 'venta';
        if (tipo === 'venta' && cantidad.gt(saldo.divisas[divisa.codigo]))
          continue;

        const tasa = new Decimal(
          tipo === 'compra' ? tc.tipoCambioCompra : tc.tipoCambioVenta,
        );
        const importe = cantidad.mul(tasa);
        if (tipo === 'compra') {
          compras = compras.plus(importe);
          saldo.mxn = saldo.mxn.minus(importe);
          saldo.divisas[divisa.codigo] =
            saldo.divisas[divisa.codigo].plus(cantidad);
        } else {
          ventas = ventas.plus(importe);
          saldo.mxn = saldo.mxn.plus(importe);
          saldo.divisas[divisa.codigo] =
            saldo.divisas[divisa.codigo].minus(cantidad);
        }

        operaciones.push({
          fechaHora: momento.toISOString(),
          tipoOperacion: tipo,
          cantidadDivisa: fijo(cantidad),
          tipoCambioAplicado: fijo(tasa),
          importeTotal: fijo(importe),
          // Más o menos la mitad son de mostrador (Cliente General)
          clienteId:
            azar.r() < 0.5
              ? clienteGeneral.id
              : clientesConNombre[azar.entero(0, clientesConNombre.length - 1)]
                  .id,
          usuarioId: cajero.id,
          monedaId: idMoneda[divisa.codigo],
          tipoCambioId: tc.id,
        });
      }

      // Los cortes de hoy quedan abiertos; los demás se cierran a las 18:00
      // (de vez en cuando con un pequeño faltante o sobrante de pesos).
      if (!esHoy) {
        const diferencia = new Decimal(
          azar.ponderado<number>([
            [0, 8],
            [-50, 1],
            [20, 1],
            [-100, 0.5],
          ]),
        );
        const divisasFinales = Object.fromEntries(
          Object.entries(saldo.divisas).map(([k, v]) => [k, fijo(v)]),
        );
        Object.assign(corte, {
          fechaCierre: fecha(dias, 18, azar.entero(0, 20)).toISOString(),
          efectivoFinal: fijo(saldo.mxn.plus(diferencia)),
          reservaFinal: fijo(saldo.reserva),
          saldosFinales: { MXN: fijo(saldo.mxn), ...divisasFinales },
          totalCompras: fijo(compras),
          totalVentas: fijo(ventas),
          diferenciaCaja: fijo(diferencia),
          diferencias: {
            MXN: fijo(diferencia),
            reserva: fijo(0),
            ...Object.fromEntries(DIVISAS.map((d) => [d.codigo, fijo(0)])),
          },
        });
        saldo.mxn = saldo.mxn.plus(diferencia); // lo contado es con lo que abre mañana
      }
      cortes.push(corte);
    }
  }

  // ---------- guardar ----------
  operaciones.sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
  await tablaOperaciones.modificar((filas) => {
    for (const op of operaciones) filas.push({ id: siguienteId(filas), ...op });
  });
  await tablaJson('CortesCaja').modificar((filas) => {
    if (filas.length > 0) return; // ya hay cortes reales: no se tocan
    filas.push(...cortes);
  });

  log.warn(
    `Datos DEMO generados: ${operaciones.length} operaciones, ${cortes.length} cortes, ` +
      `${listaClientes.length} clientes y ${cajeros.length} cajeros (usuarios: ` +
      `${cajeros.map((c) => c.usuario).join(', ')}; misma contraseña que admin). ` +
      `Desactívalo con SEED_DEMO=false.`,
  );
}
