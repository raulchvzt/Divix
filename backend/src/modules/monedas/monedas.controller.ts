import { Body, Controller, Get, Param, Patch, Post, ParseIntPipe, UseGuards } from '@nestjs/common';
import { MonedasService } from '../../services/monedas.service';
import { CrearMonedaDto } from '../../dto/monedas/crear-moneda.dto';
import { ActualizarMonedaDto } from '../../dto/monedas/actualizar-moneda.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('monedas')
export class MonedasController {
  constructor(private readonly monedasService: MonedasService) {}

  // Sin @Roles: cualquier usuario autenticado puede ver el catálogo.
  @Get()
  listar() {
    return this.monedasService.listar();
  }

  @Roles('administrador')
  @Post()
  crear(@Body() dto: CrearMonedaDto) {
    return this.monedasService.crear(dto);
  }

  @Roles('administrador')
  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarMonedaDto) {
    return this.monedasService.actualizar(id, dto);
  }

  @Roles('administrador')
  @Patch(':id/desactivar')
  desactivar(@Param('id', ParseIntPipe) id: number) {
    return this.monedasService.desactivar(id);
  }
}
