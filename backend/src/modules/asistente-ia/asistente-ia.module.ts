import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ConsultaAsistente } from '../../entities/consulta-asistente.entity';
import { AsistenteIaService } from '../../services/asistente-ia.service';
import { AsistenteIaController } from './asistente-ia.controller';
import { TiposCambioModule } from '../tipos-cambio/tipos-cambio.module';

import { CortesCajaModule } from '../cortes-caja/cortes-caja.module';
import { OperacionesModule } from '../operaciones/operaciones.module';

@Module({
  imports: [DatabaseModule.forFeature([ConsultaAsistente]), TiposCambioModule, OperacionesModule, CortesCajaModule],
  controllers: [AsistenteIaController],
  providers: [AsistenteIaService],
})
export class AsistenteIaModule {}
