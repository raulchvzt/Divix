import { Body, Controller, Get, Param, Post, ParseIntPipe, UseGuards } from '@nestjs/common';
import { TiposCambioService } from '../../services/tipos-cambio.service';
import { CrearTipoCambioDto } from '../../dto/tipos-cambio/crear-tipo-cambio.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('tipos-cambio')
export class TiposCambioController {
  constructor(private readonly tiposCambioService: TiposCambioService) {}

  @Get('actual')
  actual() {
    return this.tiposCambioService.actual();
  }

  @Roles('cajero', 'supervisor', 'administrador')
  @Get('historial/:idMoneda')
  historial(@Param('idMoneda', ParseIntPipe) idMoneda: number) {
    return this.tiposCambioService.historialPorMoneda(idMoneda);
  }

  @Roles('administrador')
  @Post()
  crear(@Body() dto: CrearTipoCambioDto, @CurrentUser('sub') idUsuario: number) {
    return this.tiposCambioService.crear(dto, idUsuario);
  }
}
