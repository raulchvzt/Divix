import { Module } from '@nestjs/common';
import { ReferenciaMercadoService } from '../../services/referencia-mercado.service';
import { ReferenciaMercadoController } from './referencia-mercado.controller';
import { TiposCambioModule } from '../tipos-cambio/tipos-cambio.module';

@Module({
  imports: [TiposCambioModule],
  controllers: [ReferenciaMercadoController],
  providers: [ReferenciaMercadoService],
})
export class ReferenciaMercadoModule {}
