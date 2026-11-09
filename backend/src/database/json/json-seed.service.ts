import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Rol } from '../../entities/rol.entity';
import { Usuario } from '../../entities/usuario.entity';
import { Moneda } from '../../entities/moneda.entity';
import { TipoCambio } from '../../entities/tipo-cambio.entity';
import { JsonRepository } from './json-repository';
import { directorioDatos } from './json-tabla';
import { sembrarOperacionesDemo } from './json-demo';

/**
 * Llena la base JSON con datos mínimos la primera vez que arranca el
 * servidor (solo si las tablas están vacías), para poder probar de inmediato.
 * Los valores de tipo de cambio son de EJEMPLO: cámbialos con POST /tipos-cambio.
 */
@Injectable()
export class JsonSeedService implements OnModuleInit {
  private readonly log = new Logger('BaseJSON');

  async onModuleInit() {
    this.log.warn(
      `Usando base de datos JSON TEMPORAL en "${directorioDatos()}". Solo para desarrollo.`,
    );

    const roles = new JsonRepository<Rol>(Rol);
    const usuarios = new JsonRepository<Usuario>(Usuario);
    const monedas = new JsonRepository<Moneda>(Moneda);
    const tiposCambio = new JsonRepository<TipoCambio>(TipoCambio);

    if ((await roles.find()).length === 0) {
      for (const [nombreRol, descripcion] of [
        ['administrador', 'Acceso total al sistema, configuración y reportes'],
        ['cajero', 'Registra operaciones de compra/venta y movimientos de caja'],
      ]) {
        await roles.save(roles.create({ nombreRol, descripcion }));
      }
    }

    if ((await usuarios.find()).length === 0) {
      const contrasena = process.env.SEED_PASSWORD ?? 'Divix12345';
      const contrasenaHash = await bcrypt.hash(contrasena, 10);
      for (const [usuario, nombre, nombreRol] of [
        ['admin', 'Administrador', 'administrador'],
        ['cajero1', 'Cajero', 'cajero'],
      ]) {
        const rol = await roles.findOne({ where: { nombreRol } });
        await usuarios.save(
          usuarios.create({
            nombre,
            apellidoPaterno: 'Demo',
            usuario,
            correo: `${usuario}@divix.mx`,
            contrasenaHash,
            rol: { id: rol!.id },
          }),
        );
      }
      this.log.warn(
        `Usuarios demo creados (admin, cajero1) con la contraseña "${contrasena}". Cámbiala.`,
      );
    }

    if ((await monedas.find()).length === 0) {
      const admin = await usuarios.findOne({ where: { usuario: 'admin' } });
      for (const [codigo, nombre, simbolo, compra, venta] of [
        ['USD', 'Dólar estadounidense', '$', '17.5000', '18.2000'],
        ['EUR', 'Euro', '€', '19.0000', '19.9000'],
      ]) {
        const moneda = await monedas.save(monedas.create({ codigo, nombre, simbolo }));
        await tiposCambio.save(
          tiposCambio.create({
            moneda: { id: moneda.id },
            tipoCambioCompra: compra,
            tipoCambioVenta: venta,
            usuario: { id: admin!.id },
          }),
        );
      }
    }

    // Operaciones ficticias para ver la app funcionando (solo si no hay ninguna).
    await sembrarOperacionesDemo(this.log);
  }
}
