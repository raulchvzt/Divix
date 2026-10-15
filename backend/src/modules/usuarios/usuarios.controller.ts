import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { UsuariosService } from '../../services/usuarios.service';
import { CrearUsuarioDto } from '../../dto/usuarios/crear-usuario.dto';
import { ActualizarUsuarioDto } from '../../dto/usuarios/actualizar-usuario.dto';
import { CambiarPasswordDto } from '../../dto/usuarios/cambiar-password.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Roles('administrador')
  @Get()
  listar(@Query('pagina') pagina?: number, @Query('limite') limite?: number) {
    return this.usuariosService.listar(pagina, limite);
  }

  @Roles('administrador')
  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.obtenerPorId(id);
  }

  @Roles('administrador')
  @Post()
  crear(@Body() dto: CrearUsuarioDto) {
    return this.usuariosService.crear(dto);
  }

  @Roles('administrador')
  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarUsuarioDto) {
    return this.usuariosService.actualizar(id, dto);
  }

  @Roles('administrador')
  @Patch(':id/desactivar')
  desactivar(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.desactivar(id);
  }

  // Sin @Roles: cualquier usuario autenticado puede cambiar su propia
  // contraseña (el guard de roles solo exige que exista sesión).
  @Patch('me/password')
  cambiarPassword(@CurrentUser('sub') idUsuario: number, @Body() dto: CambiarPasswordDto) {
    return this.usuariosService.cambiarPassword(idUsuario, dto);
  }
}
