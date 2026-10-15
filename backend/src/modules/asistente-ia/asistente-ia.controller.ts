import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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
  consultar(@Body() dto: ConsultarAsistenteDto, @CurrentUser('sub') idUsuario: number) {
    return this.asistenteIaService.consultar(dto, idUsuario);
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
