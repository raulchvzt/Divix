import { INestApplication } from '@nestjs/common';
import { bearer, cerrarApp, crearApp, CONTRASENA, http, iniciarSesion } from './ayudas';

describe('Login y permisos (e2e)', () => {
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

  describe('POST /auth/login', () => {
    it('con credenciales correctas entrega tokens y el rol', async () => {
      const r = await http(app).post('/auth/login').send({ usuario: 'admin', contrasena: CONTRASENA });
      expect(r.status).toBeLessThan(300);
      expect(r.body.accessToken).toEqual(expect.any(String));
      expect(r.body.usuario.rol).toBe('administrador');
      expect(JSON.stringify(r.body)).not.toContain('contrasenaHash');
    });

    it('contraseña incorrecta → 401', async () => {
      const r = await http(app).post('/auth/login').send({ usuario: 'admin', contrasena: 'incorrecta' });
      expect(r.status).toBe(401);
    });

    it('usuario que no existe → 401', async () => {
      const r = await http(app).post('/auth/login').send({ usuario: 'fantasma', contrasena: CONTRASENA });
      expect(r.status).toBe(401);
    });

    it('cuerpo vacío → 400', async () => {
      const r = await http(app).post('/auth/login').send({});
      expect(r.status).toBe(400);
    });

    it('contraseña vacía → 400', async () => {
      const r = await http(app).post('/auth/login').send({ usuario: 'admin', contrasena: '' });
      expect(r.status).toBe(400);
    });
  });

  describe('Rutas protegidas', () => {
    it('sin token → 401', async () => {
      expect((await http(app).get('/usuarios/me')).status).toBe(401);
      expect((await http(app).get('/clientes')).status).toBe(401);
      expect((await http(app).get('/monedas')).status).toBe(401);
    });

    it('con token falso → 401', async () => {
      const r = await http(app).get('/usuarios/me').set(bearer('esto.no.es-un-token'));
      expect(r.status).toBe(401);
    });

    it('con token firmado con otro secreto → 401', async () => {
      // JWT con estructura válida pero firma que no corresponde a nuestro secreto
      const falso =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInVzdWFyaW8iOiJhZG1pbiIsInJvbCI6ImFkbWluaXN0cmFkb3IifQ.firma-invalida';
      const r = await http(app).get('/usuarios/me').set(bearer(falso));
      expect(r.status).toBe(401);
    });

    it('un token de renovación no sirve para usar la API → 401', async () => {
      const login = await http(app).post('/auth/login').send({ usuario: 'admin', contrasena: CONTRASENA });
      const r = await http(app).get('/usuarios/me').set(bearer(login.body.refreshToken));
      expect(r.status).toBe(401);
    });
  });

  describe('Roles: administrador vs cajero', () => {
    it('un cajero recibe 403 al crear una divisa', async () => {
      const r = await http(app)
        .post('/monedas')
        .set(bearer(tokenCajero))
        .send({ codigo: 'GBP', nombre: 'Libra esterlina' });
      expect(r.status).toBe(403);
    });

    it('un cajero recibe 403 al crear un usuario', async () => {
      const r = await http(app)
        .post('/usuarios')
        .set(bearer(tokenCajero))
        .send({ nombre: 'Intruso', correo: 'intruso@prueba.mx', idRol: 1 });
      expect(r.status).toBe(403);
    });

    it('un cajero recibe 403 al ver la lista de usuarios y al cambiar tipos de cambio', async () => {
      expect((await http(app).get('/usuarios').set(bearer(tokenCajero))).status).toBe(403);
      const tc = await http(app)
        .post('/tipos-cambio')
        .set(bearer(tokenCajero))
        .send({ idMoneda: 1, tipoCambioCompra: '17', tipoCambioVenta: '18' });
      expect(tc.status).toBe(403);
    });

    it('el administrador sí puede crear una divisa (control positivo)', async () => {
      const r = await http(app)
        .post('/monedas')
        .set(bearer(tokenAdmin))
        .send({ codigo: 'GBP', nombre: 'Libra esterlina' });
      expect(r.status).toBe(201);
      expect(r.body.codigo).toBe('GBP');
    });

    it('el administrador sí puede crear un usuario y la respuesta no trae el hash', async () => {
      const roles = await http(app).get('/roles').set(bearer(tokenAdmin));
      const rolCajero = roles.body.find((x: any) => x.nombreRol === 'cajero');
      const r = await http(app)
        .post('/usuarios')
        .set(bearer(tokenAdmin))
        .send({ nombre: 'Nuevo Cajero Prueba', correo: 'nuevo@prueba.mx', idRol: rolCajero.id });
      expect(r.status).toBe(201);
      expect(r.body.contrasenaTemporal).toEqual(expect.any(String));
      expect(JSON.stringify(r.body)).not.toContain('contrasenaHash');
    });

    it('un usuario nuevo creado por el admin puede iniciar sesión con su contraseña temporal', async () => {
      const roles = await http(app).get('/roles').set(bearer(tokenAdmin));
      const rolCajero = roles.body.find((x: any) => x.nombreRol === 'cajero');
      const creado = await http(app)
        .post('/usuarios')
        .set(bearer(tokenAdmin))
        .send({ nombre: 'Otro Cajero Prueba', usuario: 'otrocajero', correo: 'otro@prueba.mx', idRol: rolCajero.id });
      const login = await http(app)
        .post('/auth/login')
        .send({ usuario: 'otrocajero', contrasena: creado.body.contrasenaTemporal });
      expect(login.status).toBeLessThan(300);
    });

    it('las listas de usuarios nunca incluyen contrasenaHash', async () => {
      const r = await http(app).get('/usuarios').set(bearer(tokenAdmin));
      expect(r.status).toBe(200);
      expect(JSON.stringify(r.body)).not.toContain('contrasenaHash');
    });
  });
});
