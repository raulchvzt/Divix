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
import { OperacionesService } from '../../services/operaciones.service';
import { CrearOperacionDto } from '../../dto/operaciones/crear-operacion.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('operaciones')
export class OperacionesController {
  constructor(private readonly operacionesService: OperacionesService) {}

  // El cajero solo ve sus propias operaciones; supervisor y administrador ven todas.
  @Roles('cajero', 'supervisor', 'administrador')
  @Get()
  listar(
    @CurrentUser() usuario: { sub: number; rol: string },
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('idCliente') idCliente?: number,
    @Query('idUsuario') idUsuario?: number,
  ) {
    return this.operacionesService.listar({
      fechaInicio: fechaInicio ? new Date(fechaInicio) : undefined,
      fechaFin: fechaFin ? new Date(fechaFin) : undefined,
      idCliente,
      idUsuario: usuario.rol === 'cajero' ? usuario.sub : idUsuario,
    });
  }

  // Cualquier rol autenticado puede ver el resumen de SU propio día;
  // la restricción real a "solo lo propio" se valida en el service
  // cuando se integre el control de pertenencia (ver nota más abajo).
  @Get('resumen-dia')
  resumenDia(@CurrentUser('sub') idUsuario: number) {
    return this.operacionesService.resumenDia(idUsuario);
  }

  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return this.operacionesService.obtenerPorId(id);
  }

  @Roles('cajero', 'administrador')
  @Post()
  crear(@Body() dto: CrearOperacionDto, @CurrentUser('sub') idUsuario: number) {
    return this.operacionesService.crear(dto, idUsuario);
  }
}
