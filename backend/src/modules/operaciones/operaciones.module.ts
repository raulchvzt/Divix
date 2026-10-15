import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { Operacion } from '../../entities/operacion.entity';
import { OperacionesService } from '../../services/operaciones.service';
import { OperacionesController } from './operaciones.controller';
import { TiposCambioModule } from '../tipos-cambio/tipos-cambio.module';

@Module({
  imports: [DatabaseModule.forFeature([Operacion]), TiposCambioModule],
  controllers: [OperacionesController],
  providers: [OperacionesService],
  exports: [OperacionesService],
})
export class OperacionesModule {}
