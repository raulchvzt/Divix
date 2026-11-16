import { BadRequestException } from '@nestjs/common';
import {
  billetesVacios,
  inventarioBilletes,
  totalBilletes,
  validarBilletes,
  verificarDisponibles,
} from './billetes';

describe('billetes de USD', () => {
  it('suma el total de un mapa', () => {
    expect(totalBilletes({ '100': 2, '20': 3, '1': 4 })).toBe(264);
    expect(totalBilletes(null)).toBe(0);
  });

  it('valida y limpia un mapa correcto', () => {
    const r = validarBilletes({ '100': 1, '5': '2' }, 'billetes', 110);
    expect(r).toEqual({ ...billetesVacios(), '100': 1, '5': 2 });
  });

  it('rechaza denominaciones que no existen', () => {
    expect(() => validarBilletes({ '3': 1 }, 'billetes')).toThrow(
      BadRequestException,
    );
  });

  it('rechaza cantidades negativas o con decimales', () => {
    expect(() => validarBilletes({ '100': -1 }, 'billetes')).toThrow(
      BadRequestException,
    );
    expect(() => validarBilletes({ '100': 1.5 }, 'billetes')).toThrow(
      BadRequestException,
    );
  });

  it('rechaza si no cuadran con el importe', () => {
    expect(() => validarBilletes({ '100': 1 }, 'billetes', 120)).toThrow(
      /suman \$100/,
    );
  });

  it('lleva el inventario con compras, ventas y movimientos', () => {
    const r = inventarioBilletes(
      { '100': 5, '20': 5 },
      [
        { tipoOperacion: 'compra', codigo: 'USD', billetes: { '100': 2 } },
        { tipoOperacion: 'venta', codigo: 'USD', billetes: { '20': 3 } },
        { tipoOperacion: 'venta', codigo: 'EUR', billetes: null },
      ],
      [{ tipoMovimiento: 'salida', moneda: 'usd', billetes: { '100': 1 } }],
    );
    expect(r.billetes['100']).toBe(6);
    expect(r.billetes['20']).toBe(2);
    expect(r.total).toBe(640);
    expect(r.completo).toBe(true);
  });

  it('marca el inventario como aproximado si falta el detalle', () => {
    const r = inventarioBilletes(
      { '100': 1 },
      [{ tipoOperacion: 'compra', codigo: 'USD' }],
      [],
    );
    expect(r.completo).toBe(false);
  });

  it('no deja entregar billetes que no hay', () => {
    expect(() =>
      verificarDisponibles({ ...billetesVacios(), '50': 1 }, { '50': 2 }),
    ).toThrow(/billetes de \$50/);
    expect(() =>
      verificarDisponibles({ ...billetesVacios(), '50': 2 }, { '50': 2 }),
    ).not.toThrow();
  });
});
