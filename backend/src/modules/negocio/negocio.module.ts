import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ConfiguracionNegocio } from '../../entities/configuracion-negocio.entity';
import { NegocioService } from '../../services/negocio.service';
import { NegocioController } from './negocio.controller';

@Module({
  imports: [DatabaseModule.forFeature([ConfiguracionNegocio])],
  controllers: [NegocioController],
  providers: [NegocioService],
})
export class NegocioModule {}
