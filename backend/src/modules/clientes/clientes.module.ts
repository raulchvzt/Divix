import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { Cliente } from '../../entities/cliente.entity';
import { Operacion } from '../../entities/operacion.entity';
import { ClientesService } from '../../services/clientes.service';
import { ClientesController } from './clientes.controller';

@Module({
  imports: [DatabaseModule.forFeature([Cliente]), DatabaseModule.forFeature([Operacion])],
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}
