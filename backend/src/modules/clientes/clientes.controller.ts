import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ClientesService } from '../../services/clientes.service';
import { CrearClienteDto } from '../../dto/clientes/crear-cliente.dto';
import { ActualizarClienteDto } from '../../dto/clientes/actualizar-cliente.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Roles('cajero', 'administrador')
  @Get()
  listar(
    @Query('busqueda') busqueda?: string,
    @Query('pagina') pagina?: number,
    @Query('limite') limite?: number,
  ) {
    return this.clientesService.listar(busqueda, pagina, limite);
  }

  @Roles('cajero', 'administrador')
  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.obtenerPorId(id);
  }

  @Roles('cajero', 'administrador')
  @Post()
  crear(@Body() dto: CrearClienteDto) {
    return this.clientesService.crear(dto);
  }

  @Roles('cajero', 'administrador')
  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarClienteDto) {
    return this.clientesService.actualizar(id, dto);
  }

  @Roles('administrador')
  @Patch(':id/desactivar')
  desactivar(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.desactivar(id);
  }

  @Roles('cajero', 'administrador')
  @Get(':id/operaciones')
  historialOperaciones(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.historialOperaciones(id);
  }
}
