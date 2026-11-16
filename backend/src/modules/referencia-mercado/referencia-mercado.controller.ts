import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ReferenciaMercadoService } from '../../services/referencia-mercado.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('referencia-mercado')
export class ReferenciaMercadoController {
  constructor(private readonly referenciaService: ReferenciaMercadoService) {}

  // Precios del negocio comparados con la referencia del mercado.
  @Roles('cajero', 'administrador')
  @Get()
  comparativo() {
    return this.referenciaService.comparativo();
  }

  // Vuelve a descargar la referencia en este momento.
  @Roles('administrador')
  @Post('actualizar')
  actualizar() {
    return this.referenciaService.comparativo(true);
  }
}
