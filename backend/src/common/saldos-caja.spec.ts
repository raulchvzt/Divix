import { saldosEsperados } from './saldos-caja';

const corte = {
  efectivoInicial: '10000',
  reservaInicial: '5000',
  saldosIniciales: { usd: '500' },
};
const op = (tipoOperacion: string, codigo: string, cantidad: string, importe: string) => ({
  tipoOperacion,
  cantidadDivisa: cantidad,
  importeTotal: importe,
  moneda: { codigo },
});

describe('saldosEsperados', () => {
  it('parte de los saldos iniciales (códigos en mayúsculas)', () => {
    const r = saldosEsperados(corte, [], []);
    expect(r.saldos.MXN.toString()).toBe('10000');
    expect(r.saldos.USD.toString()).toBe('500');
    expect(r.reserva.toString()).toBe('5000');
  });

  it('una compra suma divisa y resta pesos', () => {
    const r = saldosEsperados(corte, [op('compra', 'USD', '100', '1750')], []);
    expect(r.saldos.USD.toString()).toBe('600');
    expect(r.saldos.MXN.toString()).toBe('8250');
    expect(r.totalCompras.toString()).toBe('1750');
  });

  it('una venta resta divisa y suma pesos', () => {
    const r = saldosEsperados(corte, [op('venta', 'usd', '200', '3640')], []);
    expect(r.saldos.USD.toString()).toBe('300');
    expect(r.saldos.MXN.toString()).toBe('13640');
    expect(r.totalVentas.toString()).toBe('3640');
  });

  it('una divisa sin saldo inicial queda negativa si se vende (lo bloquea el servicio)', () => {
    const r = saldosEsperados(corte, [op('venta', 'EUR', '10', '199')], []);
    expect(r.saldos.EUR.toString()).toBe('-10');
  });

  it('entradas, salidas y reposiciones', () => {
    const r = saldosEsperados(corte, [], [
      { tipoMovimiento: 'entrada', monto: '300', moneda: 'MXN' },
      { tipoMovimiento: 'salida', monto: '50', moneda: 'USD' },
      { tipoMovimiento: 'reposicion', monto: '2000' },
    ]);
    expect(r.saldos.MXN.toString()).toBe('12300');
    expect(r.saldos.USD.toString()).toBe('450');
    expect(r.reserva.toString()).toBe('3000');
  });

  it('no pierde centavos', () => {
    const r = saldosEsperados(
      { efectivoInicial: '0.1' },
      [op('venta', 'EUR', '1', '0.2')],
      [],
    );
    expect(r.saldos.MXN.toString()).toBe('0.3');
  });
});
