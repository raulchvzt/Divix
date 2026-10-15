import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CortesCajaService } from '../../services/cortes-caja.service';
import { AbrirCorteDto } from '../../dto/cortes-caja/abrir-corte.dto';
import { CrearMovimientoCajaDto } from '../../dto/movimientos-caja/crear-movimiento-caja.dto';
import { CerrarCorteDto } from '../../dto/cortes-caja/cerrar-corte.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('cortes-caja')
export class CortesCajaController {
  constructor(private readonly cortesCajaService: CortesCajaService) {}

  @Roles('cajero', 'administrador')
  @Post('abrir')
  abrir(@Body() dto: AbrirCorteDto, @CurrentUser('sub') idUsuario: number) {
    return this.cortesCajaService.abrir(dto, idUsuario);
  }

  @Roles('cajero', 'administrador')
  @Get('activo')
  corteActivo(@CurrentUser('sub') idUsuario: number) {
    return this.cortesCajaService.corteActivo(idUsuario);
  }

  @Roles('cajero', 'administrador')
  @Get('ultimo-cierre')
  ultimoCierre(@CurrentUser('sub') idUsuario: number) {
    return this.cortesCajaService.ultimoCierre(idUsuario);
  }

  @Roles('cajero', 'administrador')
  @Post(':id/movimientos')
  registrarMovimiento(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CrearMovimientoCajaDto,
    @CurrentUser('sub') idUsuario: number,
  ) {
    return this.cortesCajaService.registrarMovimiento(id, dto, idUsuario);
  }

  @Roles('cajero', 'administrador')
  @Post(':id/cerrar')
  cerrar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CerrarCorteDto,
    @CurrentUser('sub') idUsuario: number,
  ) {
    return this.cortesCajaService.cerrar(id, dto, idUsuario);
  }

  @Roles('supervisor', 'administrador')
  @Get()
  listar(@Query('idUsuario') idUsuario?: number) {
    return this.cortesCajaService.listar({ idUsuario });
  }

  @Roles('supervisor', 'administrador')
  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return this.cortesCajaService.obtenerPorId(id);
  }
}
