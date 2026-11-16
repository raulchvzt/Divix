import { Body, Controller, Get, Param, Patch, Post, ParseIntPipe, UseGuards } from '@nestjs/common';
import { RolesService } from '../../services/roles.service';
import { CrearRolDto } from '../../dto/roles/crear-rol.dto';
import { ActualizarRolDto } from '../../dto/roles/actualizar-rol.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Roles('administrador')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  listar() {
    return this.rolesService.listar();
  }

  @Post()
  crear(@Body() dto: CrearRolDto) {
    return this.rolesService.crear(dto);
  }

  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarRolDto) {
    return this.rolesService.actualizar(id, dto);
  }
}
