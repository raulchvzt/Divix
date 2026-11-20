import { saldosEsperados } from './saldos-caja';

// Atajos para armar datos de prueba sin repetir texto.
const op = (
  tipoOperacion: 'compra' | 'venta',
  cantidadDivisa: string,
  importeTotal: string,
  codigo = 'USD',
) => ({ tipoOperacion, cantidadDivisa, importeTotal, moneda: { codigo } });

const mov = (tipoMovimiento: string, monto: string, moneda?: string | null) => ({
  tipoMovimiento,
  monto,
  moneda,
});

describe('saldosEsperados', () => {
  it('sin operaciones ni movimientos devuelve los saldos iniciales', () => {
    const r = saldosEsperados(
      {
        efectivoInicial: '10000',
        reservaInicial: '5000',
        saldosIniciales: { USD: '500' },
      },
      [],
      [],
    );
    expect(r.saldos.MXN.toString()).toBe('10000');
    expect(r.saldos.USD.toString()).toBe('500');
    expect(r.reserva.toString()).toBe('5000');
    expect(r.totalCompras.toString()).toBe('0');
    expect(r.totalVentas.toString()).toBe('0');
  });

  it('una VENTA resta divisa y suma pesos', () => {
    const r = saldosEsperados(
      { efectivoInicial: '1000', saldosIniciales: { USD: '100' } },
      [op('venta', '40', '728')],
      [],
    );
    expect(r.saldos.USD.toString()).toBe('60');
    expect(r.saldos.MXN.toString()).toBe('1728');
    expect(r.totalVentas.toString()).toBe('728');
    expect(r.totalCompras.toString()).toBe('0');
  });

  it('una COMPRA suma divisa y resta pesos', () => {
    const r = saldosEsperados(
      { efectivoInicial: '1000', saldosIniciales: { USD: '100' } },
      [op('compra', '20', '350')],
      [],
    );
    expect(r.saldos.USD.toString()).toBe('120');
    expect(r.saldos.MXN.toString()).toBe('650');
    expect(r.totalCompras.toString()).toBe('350');
  });

  it('maneja varias divisas a la vez y es insensible a mayúsculas', () => {
    const r = saldosEsperados(
      { efectivoInicial: '5000', saldosIniciales: { usd: '100', eur: '50' } },
      [op('venta', '10', '182', 'usd'), op('compra', '5', '95', 'EUR')],
      [],
    );
    expect(r.saldos.USD.toString()).toBe('90');
    expect(r.saldos.EUR.toString()).toBe('55');
    expect(r.saldos.MXN.toString()).toBe('5087'); // 5000 + 182 - 95
  });

  it('una divisa sin saldo inicial arranca en cero', () => {
    const r = saldosEsperados(
      { efectivoInicial: '1000' },
      [op('compra', '10', '175', 'EUR')],
      [],
    );
    expect(r.saldos.EUR.toString()).toBe('10');
    expect(r.saldos.MXN.toString()).toBe('825');
  });

  it('puede quedar en negativo: la validación de "no vender de más" vive en OperacionesService', () => {
    const r = saldosEsperados(
      { efectivoInicial: '0' },
      [op('venta', '10', '182')],
      [],
    );
    expect(r.saldos.USD.toString()).toBe('-10');
  });

  it('ENTRADA suma y SALIDA resta en la moneda del movimiento (MXN por defecto)', () => {
    const r = saldosEsperados(
      { efectivoInicial: '1000', saldosIniciales: { USD: '100' } },
      [],
      [
        mov('entrada', '200'),
        mov('salida', '50', null),
        mov('entrada', '30', 'usd'),
        mov('salida', '10', 'USD'),
      ],
    );
    expect(r.saldos.MXN.toString()).toBe('1150');
    expect(r.saldos.USD.toString()).toBe('120');
  });

  it('REPOSICIÓN pasa pesos de la caja fuerte a la caja del cajero', () => {
    const r = saldosEsperados(
      { efectivoInicial: '1000', reservaInicial: '5000' },
      [],
      [mov('reposicion', '2000')],
    );
    expect(r.saldos.MXN.toString()).toBe('3000');
    expect(r.reserva.toString()).toBe('3000');
  });

  it('sin reservaInicial la reserva empieza en cero', () => {
    const r = saldosEsperados({ efectivoInicial: '1000' }, [], []);
    expect(r.reserva.toString()).toBe('0');
  });

  it('no pierde centavos con decimales (usa decimal.js, no float)', () => {
    // Con números normales de JS, 0.1 + 0.2 daría 0.30000000000000004
    const r = saldosEsperados(
      { efectivoInicial: '0.1' },
      [],
      [mov('entrada', '0.2')],
    );
    expect(r.saldos.MXN.toString()).toBe('0.3');
  });

  it('ignora tipos de operación desconocidos', () => {
    const r = saldosEsperados(
      { efectivoInicial: '100' },
      [{ tipoOperacion: 'otro', cantidadDivisa: '5', importeTotal: '90', moneda: { codigo: 'USD' } }],
      [],
    );
    expect(r.saldos.MXN.toString()).toBe('100');
    expect(r.saldos.USD).toBeUndefined();
  });
});
