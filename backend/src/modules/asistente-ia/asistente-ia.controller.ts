import { Body, Controller, Get, Post, UseGuards, Param } from '@nestjs/common';
import { AsistenteIaService } from '../../services/asistente-ia.service';
import { ConsultarAsistenteDto } from '../../dto/asistente-ia/consultar-asistente.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('asistente-ia')
export class AsistenteIaController {
  constructor(private readonly asistenteIaService: AsistenteIaService) {}

  @Roles('cajero', 'supervisor', 'administrador')
  @Post('consultar')
  consultar(
    @Body() dto: ConsultarAsistenteDto,
    @CurrentUser('sub') idUsuario: number,
    @CurrentUser('rol') rol: string,
  ) {
    return this.asistenteIaService.consultar(dto, idUsuario, rol);
  }

  @Get('conversaciones')
  conversaciones(@CurrentUser('sub') idUsuario: number) {
    return this.asistenteIaService.conversaciones(idUsuario);
  }

  @Get('conversaciones/:id')
  conversacion(@Param('id') id: string, @CurrentUser('sub') idUsuario: number) {
    return this.asistenteIaService.conversacion(idUsuario, id);
  }

  @Get('historial')
  historial(@CurrentUser('sub') idUsuario: number) {
    return this.asistenteIaService.historialPorUsuario(idUsuario);
  }

  @Roles('administrador')
  @Get('historial/todas')
  historialCompleto() {
    return this.asistenteIaService.historialCompleto();
  }
}
