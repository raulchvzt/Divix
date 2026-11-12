import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../entities/usuario.entity';
import { LoginDto } from '../dto/auth/login.dto';

// Vigencias: el access token es corto; el refresh token mantiene la sesión abierta
// mientras la persona siga usando el sistema (cada renovación entrega uno nuevo).
const VIDA_ACCESO = '15m';
const VIDA_REFRESCO = '7d';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    // select: false en la entidad obliga a traer el hash explícitamente aquí
    const usuario = await this.usuariosRepo
      .createQueryBuilder('usuario')
      .addSelect('usuario.contrasenaHash')
      .leftJoinAndSelect('usuario.rol', 'rol')
      .where('usuario.usuario = :login', { login: dto.usuario })
      .andWhere('usuario.activo = true')
      .getOne();

    if (!usuario) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const coincide = await bcrypt.compare(dto.contrasena, usuario.contrasenaHash);
    if (!coincide) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    return {
      ...this.emitirTokens(usuario),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol.nombreRol,
      },
    };
  }

  /** Dos tokens con la misma identidad; `tipo` evita usar el de renovación como acceso. */
  private emitirTokens(usuario: Usuario) {
    const base = { sub: usuario.id, usuario: usuario.usuario, rol: usuario.rol.nombreRol };
    return {
      accessToken: this.jwtService.sign({ ...base, tipo: 'acceso' }, { expiresIn: VIDA_ACCESO }),
      refreshToken: this.jwtService.sign({ ...base, tipo: 'refresco' }, { expiresIn: VIDA_REFRESCO }),
    };
  }

  /**
   * Renueva la sesión con el refresh token. Vuelve a leer al usuario, así que
   * un cambio de rol o una desactivación se aplican en la siguiente renovación.
   */
  async refresh(refreshToken: string) {
    let payload: { sub: number; tipo?: string };
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Sesión vencida');
    }
    if (payload.tipo !== 'refresco') {
      throw new UnauthorizedException('Token inválido');
    }

    const usuario = await this.usuariosRepo.findOne({
      where: { id: payload.sub, activo: true },
      relations: { rol: true },
    });
    if (!usuario) {
      throw new UnauthorizedException('Usuario no válido');
    }
    return this.emitirTokens(usuario);
  }
}
