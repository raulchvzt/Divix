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
  BadRequestException,
} from '@nestjs/common';
import { UsuariosService } from '../../services/usuarios.service';
import { CrearUsuarioDto } from '../../dto/usuarios/crear-usuario.dto';
import { ActualizarUsuarioDto } from '../../dto/usuarios/actualizar-usuario.dto';
import { CambiarPasswordDto } from '../../dto/usuarios/cambiar-password.dto';
import { ActualizarPerfilDto } from '../../dto/usuarios/actualizar-perfil.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // ---- Perfil propio (cualquier usuario con sesión). Van antes de ":id". ----

  @Get('me')
  perfil(@CurrentUser('sub') idUsuario: number) {
    return this.usuariosService.obtenerPerfil(idUsuario);
  }

  @Patch('me')
  actualizarPerfil(
    @CurrentUser('sub') idUsuario: number,
    @CurrentUser('rol') rol: string,
    @Body() dto: ActualizarPerfilDto,
  ) {
    return this.usuariosService.actualizarPerfil(idUsuario, rol, dto);
  }

  // ---- Administración de usuarios ----

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
  desactivar(@Param('id', ParseIntPipe) id: number, @CurrentUser('sub') idActual: number) {
    if (id === idActual) throw new BadRequestException('No puedes desactivar tu propio usuario');
    return this.usuariosService.desactivar(id);
  }

  @Roles('administrador')
  @Patch(':id/activar')
  activar(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.activar(id);
  }

  // Sin @Roles: cualquier usuario autenticado puede cambiar su propia
  // contraseña (el guard de roles solo exige que exista sesión).
  @Patch('me/password')
  cambiarPassword(@CurrentUser('sub') idUsuario: number, @Body() dto: CambiarPasswordDto) {
    return this.usuariosService.cambiarPassword(idUsuario, dto);
  }
}
