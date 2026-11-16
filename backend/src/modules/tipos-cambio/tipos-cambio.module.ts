import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { TipoCambio } from '../../entities/tipo-cambio.entity';
import { Moneda } from '../../entities/moneda.entity';
import { TiposCambioService } from '../../services/tipos-cambio.service';
import { TiposCambioController } from './tipos-cambio.controller';

@Module({
  imports: [DatabaseModule.forFeature([TipoCambio, Moneda])],
  controllers: [TiposCambioController],
  providers: [TiposCambioService],
  exports: [TiposCambioService],
})
export class TiposCambioModule {}
