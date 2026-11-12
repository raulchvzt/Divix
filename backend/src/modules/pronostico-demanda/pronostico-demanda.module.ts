import { Module } from '@nestjs/common';
import { PronosticoDemandaService } from '../../services/pronostico-demanda.service';
import { PronosticoDemandaController } from './pronostico-demanda.controller';
import { OperacionesModule } from '../operaciones/operaciones.module';

@Module({
  imports: [OperacionesModule],
  controllers: [PronosticoDemandaController],
  providers: [PronosticoDemandaService],
  exports: [PronosticoDemandaService],
})
export class PronosticoDemandaModule {}
