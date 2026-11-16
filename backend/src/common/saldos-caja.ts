import Decimal from 'decimal.js';
import { TipoOperacion } from '../entities/operacion.entity';
import { TipoMovimiento } from '../entities/movimiento-caja.entity';

/**
 * Saldos que DEBERÍA tener una caja abierta: lo inicial ± cada operación y
 * movimiento desde la apertura. Lo usan la pantalla de Caja (esperados) y la
 * validación de operaciones (que no se venda o compre más de lo que hay).
 */

export const MXN = 'MXN';

type CorteBase = {
  efectivoInicial: string;
  reservaInicial?: string | null;
  saldosIniciales?: Record<string, string> | null;
};
type OperacionBase = {
  tipoOperacion: string;
  cantidadDivisa: string;
  importeTotal: string;
  moneda: { codigo: string };
};
type MovimientoBase = { tipoMovimiento: string; monto: string; moneda?: string | null };

export function saldosEsperados(
  corte: CorteBase,
  operaciones: OperacionBase[],
  movimientos: MovimientoBase[],
) {
  const saldos: Record<string, Decimal> = { [MXN]: new Decimal(corte.efectivoInicial) };
  for (const [c, v] of Object.entries(corte.saldosIniciales ?? {})) {
    saldos[c.toUpperCase()] = new Decimal(v);
  }
  let reserva = new Decimal(corte.reservaInicial ?? 0);
  let totalCompras = new Decimal(0);
  let totalVentas = new Decimal(0);
  const suma = (c: string, v: Decimal) => {
    saldos[c] = (saldos[c] ?? new Decimal(0)).plus(v);
  };

  for (const op of operaciones) {
    const importe = new Decimal(op.importeTotal);
    const cantidad = new Decimal(op.cantidadDivisa);
    const codigo = op.moneda.codigo.toUpperCase();
    if (op.tipoOperacion === TipoOperacion.COMPRA) {
      // El negocio compra divisa: entra la divisa y salen pesos.
      totalCompras = totalCompras.plus(importe);
      suma(MXN, importe.neg());
      suma(codigo, cantidad);
    } else if (op.tipoOperacion === TipoOperacion.VENTA) {
      // El negocio vende divisa: sale la divisa y entran pesos.
      totalVentas = totalVentas.plus(importe);
      suma(MXN, importe);
      suma(codigo, cantidad.neg());
    }
  }

  for (const m of movimientos) {
    const monto = new Decimal(m.monto);
    const codigo = (m.moneda ?? MXN).toUpperCase();
    if (m.tipoMovimiento === TipoMovimiento.ENTRADA) suma(codigo, monto);
    else if (m.tipoMovimiento === TipoMovimiento.SALIDA) suma(codigo, monto.neg());
    else {
      // Reposición: pasa pesos de la caja fuerte a la caja del cajero.
      reserva = reserva.minus(monto);
      suma(MXN, monto);
    }
  }

  return { saldos, reserva, totalCompras, totalVentas };
}
