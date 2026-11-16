import { rmSync } from 'node:fs';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/configurar-app';

/**
 * Flujo principal de la ventanilla contra la app real (con base JSON temporal):
 * sesión, permisos, validaciones y las reglas de la caja.
 */
describe('Divix (e2e)', () => {
  let app: INestApplication<App>;
  let api: ReturnType<typeof request>;
  let admin: string;
  let cajero: string;
  const monedas: Record<string, number> = {};
  let idCliente: number;

  const entrar = async (usuario: string) => {
    const r = await api
      .post('/auth/login')
      .send({ usuario, contrasena: 'Prueba12345' })
      .expect(201);
    return r.body.accessToken as string;
  };
  const operar = (tipoOperacion: string, codigo: string, cantidadDivisa: string) =>
    api
      .post('/operaciones')
      .auth(cajero, { type: 'bearer' })
      .send({ idCliente, idMoneda: monedas[codigo], tipoOperacion, cantidadDivisa });

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    configurarApp(app);
    await app.init();
    api = request(app.getHttpServer());

    admin = await entrar('admin');
    cajero = await entrar('cajero1');
    const r = await api.get('/monedas').auth(cajero, { type: 'bearer' }).expect(200);
    for (const m of r.body) monedas[m.codigo] = m.id;
  });

  afterAll(async () => {
    await app?.close();
    rmSync(process.env.JSON_DB_PATH!, { recursive: true, force: true });
  });

  describe('sesión y permisos', () => {
    it('rechaza una contraseña incorrecta', () =>
      api.post('/auth/login').send({ usuario: 'admin', contrasena: 'mala' }).expect(401));

    it('rechaza un login sin datos', () => api.post('/auth/login').send({}).expect(400));

    it('pide sesión para consultar datos', () => api.get('/monedas').expect(401));

    it('rechaza un token falso', () =>
      api.get('/monedas').auth('no-es-un-token', { type: 'bearer' }).expect(401));

    it('un cajero no puede dar de alta divisas', () =>
      api
        .post('/monedas')
        .auth(cajero, { type: 'bearer' })
        .send({ codigo: 'CAD', nombre: 'Dólar canadiense', simbolo: '$' })
        .expect(403));

    it('el administrador sí puede', () =>
      api
        .post('/monedas')
        .auth(admin, { type: 'bearer' })
        .send({ codigo: 'CAD', nombre: 'Dólar canadiense', simbolo: '$' })
        .expect(201));
  });

  describe('usuarios', () => {
    it('el administrador crea un usuario y le cambia el nombre', async () => {
      const nuevo = await api
        .post('/usuarios')
        .auth(admin, { type: 'bearer' })
        .send({ nombre: 'Luis Pérez', correo: 'luis@divix.mx', idRol: 2 })
        .expect(201);
      expect(nuevo.body.contrasenaHash).toBeUndefined();
      expect(nuevo.body.contrasenaTemporal).toEqual(expect.any(String));

      const r = await api
        .patch(`/usuarios/${nuevo.body.id}`)
        .auth(admin, { type: 'bearer' })
        .send({ nombre: 'Luis Alberto' })
        .expect(200);
      expect(r.body.nombre).toBe('Luis Alberto');
      expect(r.body.apellidoPaterno).toBe(nuevo.body.apellidoPaterno);
      expect(r.body.contrasenaHash).toBeUndefined();
    });

    it('un cajero no puede crear usuarios', () =>
      api
        .post('/usuarios')
        .auth(cajero, { type: 'bearer' })
        .send({ nombre: 'X', correo: 'x@divix.mx', idRol: 1 })
        .expect(403));
  });

  describe('clientes', () => {
    it('valida los datos obligatorios', () =>
      api
        .post('/clientes')
        .auth(cajero, { type: 'bearer' })
        .send({ identificacion: 'INE-1' })
        .expect(400));

    it('registra un cliente', async () => {
      const r = await api
        .post('/clientes')
        .auth(cajero, { type: 'bearer' })
        .send({ nombre: 'Ana', apellidoPaterno: 'Ruiz', identificacion: 'INE-1' })
        .expect(201);
      idCliente = r.body.id;
    });

    it('un cajero no puede desactivar un cliente por PATCH', async () => {
      const r = await api
        .patch(`/clientes/${idCliente}`)
        .auth(cajero, { type: 'bearer' })
        .send({ activo: false, nombre: 'Ana María' })
        .expect(200);
      expect(r.body.activo).toBe(true);
      expect(r.body.nombre).toBe('Ana María');
    });
  });

  describe('operaciones y caja', () => {
    it('no deja operar sin caja abierta', async () => {
      const r = await operar('venta', 'EUR', '10').expect(400);
      expect(r.body.message).toMatch(/Abre tu caja/);
    });

    it('rechaza un tipo de operación inválido', () => operar('regalo', 'EUR', '10').expect(400));

    it('abre la caja con 1,000 pesos y 50 euros', () =>
      api
        .post('/cortes-caja/abrir')
        .auth(cajero, { type: 'bearer' })
        .send({ efectivoInicial: '1000', reservaInicial: '0', saldosIniciales: { EUR: '50' } })
        .expect(201));

    it('no deja vender más divisa de la que hay en caja', async () => {
      const r = await operar('venta', 'EUR', '500').expect(400);
      expect(r.body.message).toMatch(/No hay suficiente/);
    });

    it('no deja comprar con más pesos de los que hay en caja', async () => {
      const r = await operar('compra', 'EUR', '5000').expect(400);
      expect(r.body.message).toMatch(/pesos/);
    });

    it('vende 30 euros y la caja lo refleja', async () => {
      const op = await operar('venta', 'EUR', '30').expect(201);
      const importe = Number(op.body.importeTotal);
      expect(importe).toBeCloseTo(30 * 19.9, 2);

      const corte = await api
        .get('/cortes-caja/activo')
        .auth(cajero, { type: 'bearer' })
        .expect(200);
      expect(Number(corte.body.esperados.EUR)).toBe(20);
      expect(Number(corte.body.esperados.MXN)).toBeCloseTo(1000 + importe, 2);
    });

    it('compra 10 euros', () => operar('compra', 'EUR', '10').expect(201));
  });
});
