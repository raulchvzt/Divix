import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { TipoCambioReferencia } from '../../entities/tipo-cambio-referencia.entity';
import { ReferenciaMercadoService } from '../../services/referencia-mercado.service';
import { ReferenciaMercadoController } from './referencia-mercado.controller';
import { TiposCambioModule } from '../tipos-cambio/tipos-cambio.module';

@Module({
  imports: [DatabaseModule.forFeature([TipoCambioReferencia]), TiposCambioModule],
  controllers: [ReferenciaMercadoController],
  providers: [ReferenciaMercadoService],
  exports: [ReferenciaMercadoService],
})
export class ReferenciaMercadoModule {}
