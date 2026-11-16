import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from '../../services/auth.service';
import { LoginDto } from '../../dto/auth/login.dto';
import { RefreshDto } from '../../dto/auth/refresh.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Sin AuthGuard: justo se usa cuando el access token ya venció.
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
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
