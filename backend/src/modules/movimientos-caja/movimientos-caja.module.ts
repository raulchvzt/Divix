import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { MovimientoCaja } from '../../entities/movimiento-caja.entity';
import { MovimientosCajaService } from '../../services/movimientos-caja.service';
import { MovimientosCajaController } from './movimientos-caja.controller';

@Module({
  imports: [DatabaseModule.forFeature([MovimientoCaja])],
  controllers: [MovimientosCajaController],
  providers: [MovimientosCajaService],
  exports: [MovimientosCajaService],
})
export class MovimientosCajaModule {}
