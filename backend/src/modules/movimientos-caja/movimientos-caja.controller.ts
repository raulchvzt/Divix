import { Body, Controller, Get, Param, Post, ParseIntPipe, UseGuards } from '@nestjs/common';
import { MovimientosCajaService } from '../../services/movimientos-caja.service';
import { CrearMovimientoCajaDto } from '../../dto/movimientos-caja/crear-movimiento-caja.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('movimientos-caja')
export class MovimientosCajaController {
  constructor(private readonly movimientosCajaService: MovimientosCajaService) {}

  @Roles('cajero', 'administrador')
  @Post(':idCorte')
  registrar(
    @Param('idCorte', ParseIntPipe) idCorte: number,
    @Body() dto: CrearMovimientoCajaDto,
    @CurrentUser('sub') idUsuario: number,
  ) {
    return this.movimientosCajaService.registrar(idCorte, dto, idUsuario);
  }

  @Roles('cajero', 'supervisor', 'administrador')
  @Get('corte/:idCorte')
  listarPorCorte(@Param('idCorte', ParseIntPipe) idCorte: number) {
    return this.movimientosCajaService.listarPorCorte(idCorte);
  }
}
