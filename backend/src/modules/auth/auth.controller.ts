import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from '../../services/auth.service';
import { LoginDto } from '../../dto/auth/login.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(AuthGuard)
  @Post('refresh')
  refresh(@CurrentUser('sub') idUsuario: number) {
    return this.authService.refresh(idUsuario);
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  logout() {
    // El JWT es stateless: "cerrar sesión" aquí es responsabilidad del
    // cliente (borrar el token). Si más adelante necesitas invalidar
    // tokens activamente, se agrega una blacklist (ej. en Redis).
    return { mensaje: 'Sesión cerrada' };
  }
}
