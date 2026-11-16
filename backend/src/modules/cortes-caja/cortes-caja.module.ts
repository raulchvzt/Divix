import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { CorteCaja } from '../../entities/corte-caja.entity';
import { CortesCajaService } from '../../services/cortes-caja.service';
import { CortesCajaController } from './cortes-caja.controller';
import { OperacionesModule } from '../operaciones/operaciones.module';
import { MovimientosCajaModule } from '../movimientos-caja/movimientos-caja.module';

@Module({
  imports: [
    DatabaseModule.forFeature([CorteCaja]),
    OperacionesModule,
    MovimientosCajaModule,
  ],
  controllers: [CortesCajaController],
  providers: [CortesCajaService],
  exports: [CortesCajaService],
})
export class CortesCajaModule {}
