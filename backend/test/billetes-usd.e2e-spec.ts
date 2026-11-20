import { INestApplication } from '@nestjs/common';
import { bearer, cerrarApp, crearApp, crearCajero, crearCliente, http, idMoneda, iniciarSesion } from './ayudas';

describe('Billetes de USD (e2e)', () => {
  let app: INestApplication;
  let tokenAdmin: string;
  let token: string; // un cajero con caja abierta: 5 billetes de $100 y 10 de $20 = $700
  let idCliente: number;
  let idUsd: number;

  const operarUsd = (cuerpo: Record<string, unknown>) =>
    http(app)
      .post('/operaciones')
      .set(bearer(token))
      .send({ idCliente, idMoneda: idUsd, ...cuerpo });

  beforeAll(async () => {
    app = await crearApp();
    tokenAdmin = await iniciarSesion(app, 'admin');
    token = (await crearCajero(app, tokenAdmin, 'cajero_billetes')).token;
    idCliente = await crearCliente(app, token, 'BILLETES');
    idUsd = await idMoneda(app, token, 'USD');

    const abierta = await http(app)
      .post('/cortes-caja/abrir')
      .set(bearer(token))
      .send({ efectivoInicial: '50000', billetesIniciales: { '100': 5, '20': 10 } });
    expect(abierta.status).toBe(201);
  });

  afterAll(async () => {
    await cerrarApp(app);
  });

  describe('Al abrir la caja', () => {
    it('el saldo inicial de USD se calcula con los billetes y el inventario queda completo', async () => {
      const r = await http(app).get('/cortes-caja/activo').set(bearer(token));
      expect(Number(r.body.esperados.USD)).toBe(700);
      expect(r.body.billetes.completo).toBe(true);
      expect(r.body.billetes.total).toBe(700);
      expect(r.body.billetes.esperados['100']).toBe(5);
    });

    it('billetes que no cuadran con el saldo de USD declarado → 400', async () => {
      const otro = await crearCajero(app, tokenAdmin, 'cajero_no_cuadra');
      const r = await http(app)
        .post('/cortes-caja/abrir')
        .set(bearer(otro.token))
        .send({ efectivoInicial: '100', saldosIniciales: { USD: '1000' }, billetesIniciales: { '100': 5 } });
      expect(r.status).toBe(400);
      expect(r.body.message).toMatch(/Los billetes suman/);
    });

    it('denominación inválida al abrir → 400', async () => {
      const otro = await crearCajero(app, tokenAdmin, 'cajero_denom');
      const r = await http(app)
        .post('/cortes-caja/abrir')
        .set(bearer(otro.token))
        .send({ efectivoInicial: '100', billetesIniciales: { '25': 2 } });
      expect(r.status).toBe(400);
    });
  });

  describe('Al operar con dólares', () => {
    it('denominación inválida → 400', async () => {
      const r = await operarUsd({ tipoOperacion: 'compra', cantidadDivisa: '75', billetes: { '75': 1 } });
      expect(r.status).toBe(400);
      expect(r.body.message).toMatch(/no existe el billete/);
    });

    it('cantidad de billetes negativa → 400', async () => {
      const r = await operarUsd({ tipoOperacion: 'compra', cantidadDivisa: '100', billetes: { '100': -1 } });
      expect(r.status).toBe(400);
    });

    it('cantidad de billetes con decimales → 400', async () => {
      const r = await operarUsd({ tipoOperacion: 'compra', cantidadDivisa: '150', billetes: { '100': 1.5 } });
      expect(r.status).toBe(400);
    });

    it('billetes que no cuadran con el importe → 400', async () => {
      // Dice 100 USD pero entrega un solo billete de $50
      const r = await operarUsd({ tipoOperacion: 'compra', cantidadDivisa: '100', billetes: { '50': 1 } });
      expect(r.status).toBe(400);
      expect(r.body.message).toMatch(/Los billetes suman \$50 pero el importe es \$100\.00/);
    });

    it('cantidad de dólares con decimales → 400', async () => {
      const r = await operarUsd({ tipoOperacion: 'compra', cantidadDivisa: '10.5', billetes: { '10': 1 } });
      expect(r.status).toBe(400);
    });

    it('entregar billetes que no hay en la caja → 400', async () => {
      // En caja no hay billetes de $50
      const r = await operarUsd({ tipoOperacion: 'venta', cantidadDivisa: '50', billetes: { '50': 1 } });
      expect(r.status).toBe(400);
      expect(r.body.message).toMatch(/No hay suficientes billetes de \$50/);
    });

    it('entregar más billetes de una denominación de los que hay → 400', async () => {
      // Hay 10 de $20; se piden 11 ($220). Hay saldo suficiente en USD, pero no billetes.
      const r = await operarUsd({ tipoOperacion: 'venta', cantidadDivisa: '220', billetes: { '20': 11 } });
      expect(r.status).toBe(400);
      expect(r.body.message).toMatch(/No hay suficientes billetes de \$20/);
    });

    it('una venta correcta con billetes que sí hay → 201 y baja el inventario', async () => {
      const r = await operarUsd({ tipoOperacion: 'venta', cantidadDivisa: '140', billetes: { '100': 1, '20': 2 } });
      expect(r.status).toBe(201);
      expect(r.body.billetes['100']).toBe(1);

      const caja = await http(app).get('/cortes-caja/activo').set(bearer(token));
      expect(caja.body.billetes.esperados['100']).toBe(4);
      expect(caja.body.billetes.esperados['20']).toBe(8);
      expect(caja.body.billetes.total).toBe(560);
      expect(Number(caja.body.esperados.USD)).toBe(560);
    });

    it('una compra correcta con billetes → 201 y sube el inventario', async () => {
      const antes = await http(app).get('/cortes-caja/activo').set(bearer(token));
      const r = await operarUsd({ tipoOperacion: 'compra', cantidadDivisa: '50', billetes: { '50': 1 } });
      expect(r.status).toBe(201);
      const despues = await http(app).get('/cortes-caja/activo').set(bearer(token));
      expect(despues.body.billetes.esperados['50']).toBe(antes.body.billetes.esperados['50'] + 1);
      expect(despues.body.billetes.total).toBe(antes.body.billetes.total + 50);
    });
  });
});
