import { INestApplication } from '@nestjs/common';
import { bearer, cerrarApp, crearApp, crearCliente, http, iniciarSesion } from './ayudas';

// Imagen mínima válida en formato data URL (1×1 píxel PNG)
const FOTO =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

describe('Clientes y Mi perfil (e2e)', () => {
  let app: INestApplication;
  let tokenAdmin: string;
  let tokenCajero: string;

  beforeAll(async () => {
    app = await crearApp();
    tokenAdmin = await iniciarSesion(app, 'admin');
    tokenCajero = await iniciarSesion(app, 'cajero1');
  });

  afterAll(async () => {
    await cerrarApp(app);
  });

  describe('Clientes', () => {
    it('crear un cliente sin nombre → 400', async () => {
      const r = await http(app)
        .post('/clientes')
        .set(bearer(tokenCajero))
        .send({ apellidoPaterno: 'Pérez', identificacion: 'INE-SIN-NOMBRE' });
      expect(r.status).toBe(400);
    });

    it('crear un cliente con datos completos → 201', async () => {
      const r = await http(app)
        .post('/clientes')
        .set(bearer(tokenCajero))
        .send({ nombre: 'Ana', apellidoPaterno: 'Pérez', identificacion: 'INE-ANA-1' });
      expect(r.status).toBe(201);
      expect(r.body.nombre).toBe('Ana');
    });

    it('no permite dos clientes con la misma identificación → 409', async () => {
      const datos = { nombre: 'Luis', apellidoPaterno: 'Gómez', identificacion: 'INE-REPETIDA' };
      expect((await http(app).post('/clientes').set(bearer(tokenCajero)).send(datos)).status).toBe(201);
      expect((await http(app).post('/clientes').set(bearer(tokenCajero)).send(datos)).status).toBe(409);
    });

    it('un cajero NO puede desactivar un cliente mandando "activo": false por PATCH (el campo se ignora)', async () => {
      const id = await crearCliente(app, tokenCajero, 'PATCH-ACTIVO');

      const r = await http(app)
        .patch(`/clientes/${id}`)
        .set(bearer(tokenCajero))
        .send({ activo: false, nombre: 'Nombre Nuevo' });
      expect(r.status).toBe(200);
      expect(r.body.nombre).toBe('Nombre Nuevo'); // lo permitido sí se guardó
      expect(r.body.activo).toBe(true); // lo prohibido se ignoró

      const despues = await http(app).get(`/clientes/${id}`).set(bearer(tokenCajero));
      expect(despues.body.activo).toBe(true);
    });

    it('un cajero recibe 403 en el endpoint de desactivar; el administrador sí puede', async () => {
      const id = await crearCliente(app, tokenCajero, 'DESACTIVAR');
      expect((await http(app).patch(`/clientes/${id}/desactivar`).set(bearer(tokenCajero))).status).toBe(403);
      const r = await http(app).patch(`/clientes/${id}/desactivar`).set(bearer(tokenAdmin));
      expect(r.status).toBe(200);
      expect(r.body.activo).toBe(false);
    });
  });

  describe('Mi perfil: /usuarios/me', () => {
    it.each([
      ['administrador', 'admin'],
      ['cajero', 'cajero1'],
    ])('GET /usuarios/me del %s devuelve su perfil sin contrasenaHash', async (_rol, usuario) => {
      const token = await iniciarSesion(app, usuario);
      const r = await http(app).get('/usuarios/me').set(bearer(token));
      expect(r.status).toBe(200);
      expect(r.body.usuario).toBe(usuario);
      expect(r.body).toHaveProperty('foto');
      expect(JSON.stringify(r.body)).not.toContain('contrasenaHash');
    });

    it('un cajero recibe 403 si intenta cambiar su nombre', async () => {
      const r = await http(app).patch('/usuarios/me').set(bearer(tokenCajero)).send({ nombre: 'Otro Nombre' });
      expect(r.status).toBe(403);
    });

    it('un cajero recibe 403 si intenta cambiar su correo', async () => {
      const r = await http(app).patch('/usuarios/me').set(bearer(tokenCajero)).send({ correo: 'nuevo@correo.mx' });
      expect(r.status).toBe(403);
    });

    it('un cajero SÍ puede cambiar su foto, y el hash no aparece en la respuesta', async () => {
      const r = await http(app).patch('/usuarios/me').set(bearer(tokenCajero)).send({ foto: FOTO });
      expect(r.status).toBe(200);
      expect(r.body.foto).toBe(FOTO);
      expect(JSON.stringify(r.body)).not.toContain('contrasenaHash');

      const perfil = await http(app).get('/usuarios/me').set(bearer(tokenCajero));
      expect(perfil.body.foto).toBe(FOTO);
    });

    it('un cajero puede quitar su foto mandando null', async () => {
      const r = await http(app).patch('/usuarios/me').set(bearer(tokenCajero)).send({ foto: null });
      expect(r.status).toBe(200);
      expect(r.body.foto).toBeNull();
    });

    it('rechaza una foto que no es imagen JPG/PNG/WebP → 400', async () => {
      const r = await http(app).patch('/usuarios/me').set(bearer(tokenCajero)).send({ foto: 'no-soy-una-imagen' });
      expect(r.status).toBe(400);
    });

    it('el administrador SÍ puede cambiar su nombre', async () => {
      const r = await http(app).patch('/usuarios/me').set(bearer(tokenAdmin)).send({ nombre: 'Admin Renombrado' });
      expect(r.status).toBe(200);
      expect(r.body.nombre).toBe('Admin Renombrado');
      expect(JSON.stringify(r.body)).not.toContain('contrasenaHash');
    });

    it('sin sesión no hay perfil → 401', async () => {
      expect((await http(app).get('/usuarios/me')).status).toBe(401);
      expect((await http(app).patch('/usuarios/me').send({ foto: null })).status).toBe(401);
    });
  });
});
