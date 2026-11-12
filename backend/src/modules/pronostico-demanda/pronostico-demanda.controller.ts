import { Controller, Get, UseGuards } from '@nestjs/common';
import { PronosticoDemandaService } from '../../services/pronostico-demanda.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('pronostico-demanda')
export class PronosticoDemandaController {
  constructor(private readonly pronosticoService: PronosticoDemandaService) {}

  // Demanda esperada de cada divisa en los próximos meses (de todo el negocio).
  @Roles('cajero', 'administrador')
  @Get()
  pronosticar() {
    return this.pronosticoService.pronosticar();
  }
}
