import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { Moneda } from '../../entities/moneda.entity';
import { MonedasService } from '../../services/monedas.service';
import { MonedasController } from './monedas.controller';

@Module({
  imports: [DatabaseModule.forFeature([Moneda])],
  controllers: [MonedasController],
  providers: [MonedasService],
  exports: [MonedasService],
})
export class MonedasModule {}
