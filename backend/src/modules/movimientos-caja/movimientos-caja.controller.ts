import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { MovimientosCajaService } from '../../services/movimientos-caja.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('movimientos-caja')
export class MovimientosCajaController {
  constructor(private readonly movimientosCajaService: MovimientosCajaService) {}

  // Para registrar un movimiento usa POST /cortes-caja/:id/movimientos
  // (ahí se validan saldos y pertenencia del corte).
  @Roles('cajero', 'supervisor', 'administrador')
  @Get('corte/:idCorte')
  listarPorCorte(@Param('idCorte', ParseIntPipe) idCorte: number) {
    return this.movimientosCajaService.listarPorCorte(idCorte);
  }
}
