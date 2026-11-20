import { rm } from 'fs/promises';
import { tmpdir } from 'os';
import { resolve, sep } from 'path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/configurar-app';

export const CONTRASENA = process.env.SEED_PASSWORD as string;

export type Http = ReturnType<typeof request>;

/** Seguro extra: jamás se trabaja (ni se borra) fuera de la carpeta temporal del sistema. */
function carpetaTemporal(): string {
  const ruta = resolve(process.env.JSON_DB_PATH ?? '');
  if (
    process.env.DB_DRIVER !== 'json' ||
    !ruta.startsWith(resolve(tmpdir()) + sep) ||
    ruta.includes(`${sep}backend${sep}data`)
  ) {
    throw new Error(
      `Las pruebas e2e solo pueden usar una base JSON temporal. JSON_DB_PATH actual: "${ruta}"`,
    );
  }
  return ruta;
}

/** Arranca la app completa igual que main.ts (mismos CORS y ValidationPipe). */
export async function crearApp(): Promise<INestApplication> {
  carpetaTemporal();
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = modulo.createNestApplication();
  configurarApp(app);
  await app.init();
  return app;
}

/** Cierra la app y borra la carpeta temporal con todos sus .json. */
export async function cerrarApp(app: INestApplication | undefined) {
  const ruta = carpetaTemporal();
  await app?.close();
  await rm(ruta, { recursive: true, force: true });
}

export const http = (app: INestApplication) => request(app.getHttpServer());

export async function iniciarSesion(app: INestApplication, usuario: string, contrasena = CONTRASENA) {
  const r = await http(app).post('/auth/login').send({ usuario, contrasena });
  if (r.status !== 201 && r.status !== 200) {
    throw new Error(`No se pudo iniciar sesión como ${usuario}: ${r.status} ${JSON.stringify(r.body)}`);
  }
  return r.body.accessToken as string;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Crea un cajero nuevo (lo hace el admin) y devuelve su token y su id. */
export async function crearCajero(app: INestApplication, tokenAdmin: string, usuario: string) {
  const roles = await http(app).get('/roles').set(bearer(tokenAdmin));
  const rolCajero = roles.body.find((r: any) => r.nombreRol === 'cajero');
  const r = await http(app)
    .post('/usuarios')
    .set(bearer(tokenAdmin))
    .send({ nombre: 'Cajero Extra Prueba', usuario, correo: `${usuario}@prueba.mx`, contrasena: CONTRASENA, idRol: rolCajero.id });
  if (r.status !== 201) throw new Error(`No se pudo crear el cajero: ${r.status} ${JSON.stringify(r.body)}`);
  return { id: r.body.id as number, token: await iniciarSesion(app, usuario) };
}

export async function crearCliente(app: INestApplication, token: string, sufijo = Date.now().toString()) {
  const r = await http(app)
    .post('/clientes')
    .set(bearer(token))
    .send({ nombre: 'Cliente', apellidoPaterno: 'Prueba', identificacion: `INE-${sufijo}` });
  if (r.status !== 201) throw new Error(`No se pudo crear el cliente: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.id as number;
}

/** Devuelve el id de una moneda del catálogo ('USD', 'EUR'). */
export async function idMoneda(app: INestApplication, token: string, codigo: string) {
  const r = await http(app).get('/monedas').set(bearer(token));
  return r.body.find((m: any) => m.codigo === codigo).id as number;
}
