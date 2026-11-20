import { BadRequestException } from '@nestjs/common';
import {
  DENOMINACIONES,
  billetesVacios,
  inventarioBilletes,
  sumarBilletes,
  totalBilletes,
  validarBilletes,
  verificarDisponibles,
} from './billetes';

describe('billetes: utilidades básicas', () => {
  it('billetesVacios trae todas las denominaciones en cero', () => {
    const v = billetesVacios();
    expect(Object.keys(v).sort()).toEqual(DENOMINACIONES.map(String).sort());
    expect(Object.values(v).every((n) => n === 0)).toBe(true);
  });

  it('totalBilletes suma denominación × cantidad', () => {
    expect(totalBilletes({ '100': 2, '20': 3, '1': 4 })).toBe(264);
    expect(totalBilletes(null)).toBe(0);
    expect(totalBilletes(undefined)).toBe(0);
  });

  it('sumarBilletes suma y resta por denominación sin modificar el original', () => {
    const a = { ...billetesVacios(), '100': 5, '50': 2 };
    const suma = sumarBilletes(a, { '100': 1, '50': 1 });
    expect(suma['100']).toBe(6);
    expect(suma['50']).toBe(3);
    const resta = sumarBilletes(a, { '100': 2 }, -1);
    expect(resta['100']).toBe(3);
    expect(a['100']).toBe(5);
  });
});

describe('validarBilletes', () => {
  it('acepta un mapa correcto y lo devuelve completo (las que faltan en cero)', () => {
    const r = validarBilletes({ '100': 2, '50': 1 }, 'billetes');
    expect(r['100']).toBe(2);
    expect(r['50']).toBe(1);
    expect(r['20']).toBe(0);
  });

  it.each([
    ['null', null],
    ['texto', 'hola'],
    ['número', 5],
    ['arreglo', [1, 2]],
  ])('rechaza algo que no es un objeto (%s)', (_nombre, valor) => {
    expect(() => validarBilletes(valor, 'billetes')).toThrow(BadRequestException);
  });

  it.each(['3', '25', '200', '0', 'abc'])(
    'rechaza la denominación inválida "%s"',
    (clave) => {
      expect(() => validarBilletes({ [clave]: 1 }, 'billetes')).toThrow(/no existe el billete/);
    },
  );

  it.each([
    ['negativa', -1],
    ['con decimales', 1.5],
    ['texto no numérico', 'muchos'],
  ])('rechaza una cantidad %s', (_nombre, cantidad) => {
    expect(() => validarBilletes({ '100': cantidad }, 'billetes')).toThrow(
      /entero ≥ 0/,
    );
  });

  it('acepta cantidad cero', () => {
    expect(validarBilletes({ '100': 0 }, 'billetes')['100']).toBe(0);
  });

  it('con total: acepta billetes que cuadran exactamente', () => {
    // 2×100 + 1×50 + 2×5 = 260
    expect(() =>
      validarBilletes({ '100': 2, '50': 1, '5': 2 }, 'billetes', '260'),
    ).not.toThrow();
  });

  it('con total: rechaza billetes que suman de más o de menos', () => {
    expect(() => validarBilletes({ '100': 2 }, 'billetes', 250)).toThrow(
      /suman \$200 pero el importe es \$250\.00/,
    );
    expect(() => validarBilletes({ '100': 3 }, 'billetes', '250')).toThrow(
      BadRequestException,
    );
  });

  it('el error menciona el nombre del campo para que el usuario sepa cuál falló', () => {
    expect(() => validarBilletes(null, 'billetesIniciales')).toThrow(/billetesIniciales/);
  });
});

describe('verificarDisponibles', () => {
  const caja = { ...billetesVacios(), '100': 3, '20': 5 };

  it('permite entregar billetes que sí hay (incluso todos)', () => {
    expect(() => verificarDisponibles(caja, { '100': 3, '20': 5 })).not.toThrow();
  });

  it('rechaza entregar más billetes de los que hay de una denominación', () => {
    expect(() => verificarDisponibles(caja, { '100': 4 })).toThrow(
      /No hay suficientes billetes de \$100: quieres entregar 4 y en caja hay 3/,
    );
  });

  it('rechaza entregar una denominación que no hay en caja', () => {
    expect(() => verificarDisponibles(caja, { '50': 1 })).toThrow(BadRequestException);
  });
});

describe('inventarioBilletes', () => {
  const iniciales = { ...billetesVacios(), '100': 5, '20': 10 }; // $700

  it('sin operaciones ni movimientos devuelve los iniciales', () => {
    const r = inventarioBilletes(iniciales, [], []);
    expect(r.billetes['100']).toBe(5);
    expect(r.total).toBe(700);
    expect(r.completo).toBe(true);
  });

  it('una compra de USD suma billetes y una venta los resta', () => {
    const r = inventarioBilletes(
      iniciales,
      [
        { tipoOperacion: 'compra', codigo: 'USD', billetes: { '100': 2 } },
        { tipoOperacion: 'venta', codigo: 'USD', billetes: { '20': 4 } },
      ],
      [],
    );
    expect(r.billetes['100']).toBe(7);
    expect(r.billetes['20']).toBe(6);
    expect(r.total).toBe(820);
    expect(r.completo).toBe(true);
  });

  it('ignora operaciones de otras monedas', () => {
    const r = inventarioBilletes(
      iniciales,
      [{ tipoOperacion: 'venta', codigo: 'EUR', billetes: { '100': 5 } }],
      [],
    );
    expect(r.total).toBe(700);
    expect(r.completo).toBe(true);
  });

  it('una operación de USD sin detalle de billetes marca el inventario como incompleto', () => {
    const r = inventarioBilletes(
      iniciales,
      [{ tipoOperacion: 'venta', codigo: 'USD', billetes: null }],
      [],
    );
    expect(r.completo).toBe(false);
    expect(r.total).toBe(700);
  });

  it('sin billetes iniciales el inventario es incompleto', () => {
    expect(inventarioBilletes(null, [], []).completo).toBe(false);
  });

  it('movimientos: entrada suma, salida resta; reposición y otras monedas se ignoran', () => {
    const r = inventarioBilletes(
      iniciales,
      [],
      [
        { tipoMovimiento: 'entrada', moneda: 'USD', billetes: { '100': 1 } },
        { tipoMovimiento: 'salida', moneda: 'usd', billetes: { '20': 2 } },
        { tipoMovimiento: 'reposicion', moneda: 'MXN', billetes: null },
        { tipoMovimiento: 'entrada', moneda: 'EUR', billetes: { '100': 9 } },
      ],
    );
    expect(r.billetes['100']).toBe(6);
    expect(r.billetes['20']).toBe(8);
    expect(r.completo).toBe(true);
  });

  it('un movimiento de USD sin detalle de billetes marca incompleto', () => {
    const r = inventarioBilletes(
      iniciales,
      [],
      [{ tipoMovimiento: 'entrada', moneda: 'USD', billetes: null }],
    );
    expect(r.completo).toBe(false);
  });
});
