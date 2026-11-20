import { INestApplication } from '@nestjs/common';
import {
  bearer,
  cerrarApp,
  crearApp,
  crearCajero,
  crearCliente,
  http,
  idMoneda,
  iniciarSesion,
} from './ayudas';

// Tipos de cambio de la base de ejemplo (json-seed.service): USD compra 17.50 / venta 18.20.
const VENTA_USD = 18.2;
const COMPRA_USD = 17.5;

describe('Operaciones y caja (e2e)', () => {
  let app: INestApplication;
  let tokenAdmin: string;
  let tokenCajero: string; // cajero1, el de la base de ejemplo
  let idCliente: number;
  let idUsd: number;

  const operar = (token: string, cuerpo: Record<string, unknown>) =>
    http(app)
      .post('/operaciones')
      .set(bearer(token))
      .send({ idCliente, idMoneda: idUsd, ...cuerpo });

  beforeAll(async () => {
    app = await crearApp();
    tokenAdmin = await iniciarSesion(app, 'admin');
    tokenCajero = await iniciarSesion(app, 'cajero1');
    idCliente = await crearCliente(app, tokenCajero, 'OPERACIONES');
    idUsd = await idMoneda(app, tokenCajero, 'USD');
  });

  afterAll(async () => {
    await cerrarApp(app);
  });

  // IMPORTANTE: este bloque va primero porque cajero1 todavía no ha abierto caja.
  describe('Sin caja abierta', () => {
    it('no se puede registrar una operación → 400 "Abre tu caja…"', async () => {
      const r = await operar(tokenCajero, { tipoOperacion: 'venta', cantidadDivisa: '10' });
      expect(r.status).toBe(400);
      expect(r.body.message).toMatch(/Abre tu caja/);
    });

    it('GET /cortes-caja/activo no es un error: no hay corte abierto', async () => {
      const r = await http(app).get('/cortes-caja/activo').set(bearer(tokenCajero));
      expect(r.status).toBe(200);
      expect(r.body === null || r.body === '' || Object.keys(r.body).length === 0).toBe(true);
    });
  });

  describe('Validación de la operación', () => {
    beforeAll(async () => {
      const r = await http(app)
        .post('/cortes-caja/abrir')
        .set(bearer(tokenCajero))
        .send({ efectivoInicial: '10000', saldosIniciales: { USD: '1000' } });
      expect(r.status).toBe(201);
    });

    it('tipo de operación inválido → 400', async () => {
      const r = await operar(tokenCajero, { tipoOperacion: 'regalo', cantidadDivisa: '10' });
      expect(r.status).toBe(400);
    });

    it('sin tipo de operación → 400', async () => {
      const r = await operar(tokenCajero, { cantidadDivisa: '10' });
      expect(r.status).toBe(400);
    });

    it('cantidad que no es número → 400', async () => {
      const r = await operar(tokenCajero, { tipoOperacion: 'venta', cantidadDivisa: 'muchos' });
      expect(r.status).toBe(400);
    });

    it('cantidad cero o negativa → 400', async () => {
      expect((await operar(tokenCajero, { tipoOperacion: 'venta', cantidadDivisa: '0' })).status).toBe(400);
      expect((await operar(tokenCajero, { tipoOperacion: 'venta', cantidadDivisa: '-5' })).status).toBe(400);
    });

    it('vender más divisa de la que hay en la caja → 400', async () => {
      const r = await operar(tokenCajero, { tipoOperacion: 'venta', cantidadDivisa: '1000.01' });
      expect(r.status).toBe(400);
      expect(r.body.message).toMatch(/No hay suficiente USD/);
    });

    it('vender exactamente toda la divisa que hay SÍ se permite (y deja la caja en cero)', async () => {
      // Se usa un cajero aparte para no alterar el estado de cajero1
      const { token } = await crearCajero(app, tokenAdmin, 'cajero_todo');
      await http(app)
        .post('/cortes-caja/abrir')
        .set(bearer(token))
        .send({ efectivoInicial: '0', saldosIniciales: { USD: '50' } });
      const r = await operar(token, { tipoOperacion: 'venta', cantidadDivisa: '50' });
      expect(r.status).toBe(201);
      const caja = await http(app).get('/cortes-caja/activo').set(bearer(token));
      expect(Number(caja.body.esperados.USD)).toBe(0);
    });

    it('comprar sin pesos suficientes en la caja → 400', async () => {
      const { token } = await crearCajero(app, tokenAdmin, 'cajero_pobre');
      await http(app)
        .post('/cortes-caja/abrir')
        .set(bearer(token))
        .send({ efectivoInicial: '100' }); // solo $100 MXN
      // 100 USD × 17.50 = $1,750 MXN, no alcanza
      const r = await operar(token, { tipoOperacion: 'compra', cantidadDivisa: '100' });
      expect(r.status).toBe(400);
      expect(r.body.message).toMatch(/No hay suficientes pesos/);
    });

    it('el importe lo calcula el servidor: lo que mande el cliente se ignora', async () => {
      const r = await operar(tokenCajero, {
        tipoOperacion: 'venta',
        cantidadDivisa: '10',
        importeTotal: '1',
        tipoCambioAplicado: '1',
      });
      expect(r.status).toBe(201);
      expect(Number(r.body.importeTotal)).toBeCloseTo(10 * VENTA_USD, 4);
      expect(Number(r.body.tipoCambioAplicado)).toBeCloseTo(VENTA_USD, 4);
    });

    it('un cajero solo ve sus propias operaciones y el administrador ve todas', async () => {
      const { token } = await crearCajero(app, tokenAdmin, 'cajero_ajeno');
      const delCajero = await http(app).get('/operaciones').set(bearer(token));
      expect(delCajero.status).toBe(200);
      expect(delCajero.body).toHaveLength(0);

      const delAdmin = await http(app).get('/operaciones').set(bearer(tokenAdmin));
      expect(delAdmin.body.length).toBeGreaterThan(0);
    });
  });

  describe('Caja: saldos esperados después de operar', () => {
    it('al abrir con saldos iniciales y vender, los esperados muestran divisa menos y pesos más', async () => {
      const { token } = await crearCajero(app, tokenAdmin, 'cajero_saldos');

      const abierta = await http(app)
        .post('/cortes-caja/abrir')
        .set(bearer(token))
        .send({ efectivoInicial: '5000', reservaInicial: '20000', saldosIniciales: { USD: '300' } });
      expect(abierta.status).toBe(201);

      // Venta de 100 USD a 18.20 = 1,820 MXN que entran
      const venta = await operar(token, { tipoOperacion: 'venta', cantidadDivisa: '100' });
      expect(venta.status).toBe(201);

      const caja = await http(app).get('/cortes-caja/activo').set(bearer(token));
      expect(caja.status).toBe(200);
      expect(Number(caja.body.esperados.USD)).toBe(200); // 300 - 100
      expect(Number(caja.body.esperados.MXN)).toBeCloseTo(5000 + 100 * VENTA_USD, 4); // 6,820
      expect(Number(caja.body.esperados.reserva)).toBe(20000); // la caja fuerte no cambia
    });

    it('una compra suma divisa y resta pesos en los esperados', async () => {
      const { token } = await crearCajero(app, tokenAdmin, 'cajero_compra');
      await http(app)
        .post('/cortes-caja/abrir')
        .set(bearer(token))
        .send({ efectivoInicial: '5000', saldosIniciales: { USD: '0' } });

      const compra = await operar(token, { tipoOperacion: 'compra', cantidadDivisa: '40' });
      expect(compra.status).toBe(201);

      const caja = await http(app).get('/cortes-caja/activo').set(bearer(token));
      expect(Number(caja.body.esperados.USD)).toBe(40);
      expect(Number(caja.body.esperados.MXN)).toBeCloseTo(5000 - 40 * COMPRA_USD, 4); // 4,300
    });

    it('no se puede abrir una segunda caja mientras hay una abierta → 409', async () => {
      const r = await http(app)
        .post('/cortes-caja/abrir')
        .set(bearer(tokenCajero))
        .send({ efectivoInicial: '100' });
      expect(r.status).toBe(409);
    });

    it('una reposición pasa pesos de la caja fuerte a la caja del cajero', async () => {
      const { token } = await crearCajero(app, tokenAdmin, 'cajero_repo');
      const abierta = await http(app)
        .post('/cortes-caja/abrir')
        .set(bearer(token))
        .send({ efectivoInicial: '1000', reservaInicial: '5000' });
      const mov = await http(app)
        .post(`/cortes-caja/${abierta.body.id}/movimientos`)
        .set(bearer(token))
        .send({ tipoMovimiento: 'reposicion', monto: '2000' });
      expect(mov.status).toBe(201);
      const caja = await http(app).get('/cortes-caja/activo').set(bearer(token));
      expect(Number(caja.body.esperados.MXN)).toBe(3000);
      expect(Number(caja.body.esperados.reserva)).toBe(3000);
    });
  });
});
