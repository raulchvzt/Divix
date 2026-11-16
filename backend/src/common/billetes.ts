import { BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';

/**
 * Control de BILLETES de dólar por denominación.
 *
 * Solo se lleva para USD. Se guarda:
 *  - al abrir caja: cuántos billetes de cada uno había (billetesIniciales)
 *  - en cada operación y movimiento de USD: qué billetes entraron o salieron
 *  - al cerrar caja: cuántos se contaron (billetesFinales)
 * Con eso se sabe en todo momento cuántos billetes de cada uno DEBERÍA haber.
 *
 * Un mapa de billetes es { "100": 5, "50": 2, ... } (denominación → cantidad).
 */

export const MONEDA_BILLETES = 'USD';
export const DENOMINACIONES = [100, 50, 20, 10, 5, 2, 1] as const;

export type MapaBilletes = Record<string, number>;

export const billetesVacios = (): MapaBilletes =>
  Object.fromEntries(DENOMINACIONES.map((d) => [String(d), 0]));

export const totalBilletes = (mapa: MapaBilletes | null | undefined) =>
  DENOMINACIONES.reduce((t, d) => t + d * (mapa?.[String(d)] ?? 0), 0);

/**
 * Valida un mapa recibido del cliente y lo devuelve limpio. Si se indica
 * `total`, la suma de los billetes debe ser exactamente ese importe.
 */
export function validarBilletes(
  mapa: unknown,
  campo: string,
  total?: Decimal.Value,
): MapaBilletes {
  if (!mapa || typeof mapa !== 'object' || Array.isArray(mapa)) {
    throw new BadRequestException(
      `"${campo}" debe ser un objeto { "100": 5, ... }`,
    );
  }
  const limpio = billetesVacios();
  for (const [clave, valor] of Object.entries(
    mapa as Record<string, unknown>,
  )) {
    if (
      !DENOMINACIONES.includes(Number(clave) as (typeof DENOMINACIONES)[number])
    ) {
      throw new BadRequestException(
        `"${campo}": no existe el billete de $${clave}`,
      );
    }
    const n = Number(valor);
    if (!Number.isInteger(n) || n < 0) {
      throw new BadRequestException(
        `"${campo}": la cantidad de billetes de $${clave} debe ser un entero ≥ 0`,
      );
    }
    limpio[String(Number(clave))] = n;
  }
  if (total !== undefined) {
    const esperado = new Decimal(total);
    const suma = totalBilletes(limpio);
    if (!esperado.eq(suma)) {
      throw new BadRequestException(
        `Los billetes suman $${suma} pero el importe es $${esperado.toFixed(2)}`,
      );
    }
  }
  return limpio;
}

/** a + signo·b, por denominación. */
export function sumarBilletes(
  a: MapaBilletes,
  b: MapaBilletes | null | undefined,
  signo = 1,
) {
  const r = { ...a };
  for (const d of DENOMINACIONES) {
    const k = String(d);
    r[k] = (r[k] ?? 0) + signo * (b?.[k] ?? 0);
  }
  return r;
}

/**
 * Billetes que debería haber en la caja: los iniciales ± los de cada operación
 * y movimiento de USD. `completo` es false si alguna operación o movimiento de
 * USD no trae el detalle de billetes (entonces el inventario es aproximado).
 */
export function inventarioBilletes(
  iniciales: MapaBilletes | null | undefined,
  operaciones: {
    tipoOperacion: string;
    codigo: string;
    billetes?: MapaBilletes | null;
  }[],
  movimientos: {
    tipoMovimiento: string;
    moneda: string;
    billetes?: MapaBilletes | null;
  }[],
) {
  let billetes = sumarBilletes(billetesVacios(), iniciales);
  let completo = !!iniciales;

  for (const op of operaciones) {
    if (op.codigo !== MONEDA_BILLETES) continue;
    if (!op.billetes) {
      completo = false;
      continue;
    }
    // compra: el cliente nos entrega dólares; venta: se los damos.
    billetes = sumarBilletes(
      billetes,
      op.billetes,
      op.tipoOperacion === 'compra' ? 1 : -1,
    );
  }
  for (const m of movimientos) {
    if ((m.moneda ?? '').toUpperCase() !== MONEDA_BILLETES) continue;
    if (m.tipoMovimiento !== 'entrada' && m.tipoMovimiento !== 'salida')
      continue;
    if (!m.billetes) {
      completo = false;
      continue;
    }
    billetes = sumarBilletes(
      billetes,
      m.billetes,
      m.tipoMovimiento === 'entrada' ? 1 : -1,
    );
  }
  return { billetes, completo, total: totalBilletes(billetes) };
}

/** Lanza 400 si se quieren entregar billetes que no hay en la caja. */
export function verificarDisponibles(
  disponibles: MapaBilletes,
  salen: MapaBilletes,
) {
  for (const d of DENOMINACIONES) {
    const k = String(d);
    const hay = disponibles[k] ?? 0;
    if ((salen[k] ?? 0) > hay) {
      throw new BadRequestException(
        `No hay suficientes billetes de $${d}: quieres entregar ${salen[k]} y en caja hay ${hay}`,
      );
    }
  }
}
