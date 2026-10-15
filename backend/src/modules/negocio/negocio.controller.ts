import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { NegocioService } from '../../services/negocio.service';
import { ActualizarNegocioDto } from '../../dto/negocio/actualizar-negocio.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('negocio')
export class NegocioController {
  constructor(private readonly negocioService: NegocioService) {}

  // Cualquier usuario autenticado puede ver los datos del negocio.
  @Get()
  obtener() {
    return this.negocioService.obtener();
  }

  @Roles('administrador')
  @Put()
  actualizar(@Body() dto: ActualizarNegocioDto) {
    return this.negocioService.actualizar(dto);
  }
}
