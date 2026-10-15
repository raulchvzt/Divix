import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { RolesModule } from './modules/roles/roles.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { MonedasModule } from './modules/monedas/monedas.module';
import { TiposCambioModule } from './modules/tipos-cambio/tipos-cambio.module';
import { OperacionesModule } from './modules/operaciones/operaciones.module';
import { MovimientosCajaModule } from './modules/movimientos-caja/movimientos-caja.module';
import { CortesCajaModule } from './modules/cortes-caja/cortes-caja.module';
import { AsistenteIaModule } from './modules/asistente-ia/asistente-ia.module';

@Module({
  imports: [
    // Carga el archivo .env y lo deja disponible en toda la app
    ConfigModule.forRoot({ isGlobal: true }),

    // MySQL o base JSON temporal, según DB_DRIVER en el .env
    DatabaseModule.forRoot(),

    AuthModule,
    UsuariosModule,
    RolesModule,
    ClientesModule,
    MonedasModule,
    TiposCambioModule,
    OperacionesModule,
    MovimientosCajaModule,
    CortesCajaModule,
    AsistenteIaModule,
  ],
})
export class AppModule {}
