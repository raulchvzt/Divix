import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ReferenciaMercadoService } from '../../services/referencia-mercado.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('referencia-mercado')
export class ReferenciaMercadoController {
  constructor(private readonly referenciaService: ReferenciaMercadoService) {}

  // Resumen de la referencia externa vs. los precios del negocio.
  @Roles('supervisor', 'administrador')
  @Get()
  async resumen() {
    return (await this.referenciaService.resumen()) ?? [];
  }

  // Fuerza la descarga ahora y muestra qué pasó con cada moneda (útil para diagnosticar).
  @Roles('administrador')
  @Post('sincronizar')
  sincronizar() {
    return this.referenciaService.sincronizar();
  }
}
