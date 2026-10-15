import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../entities/usuario.entity';
import { LoginDto } from '../dto/auth/login.dto';

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

    const payload = {
      sub: usuario.id,
      usuario: usuario.usuario,
      rol: usuario.rol.nombreRol,
    };

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol.nombreRol,
      },
    };
  }

  async refresh(usuarioId: number) {
    const usuario = await this.usuariosRepo.findOne({
      where: { id: usuarioId, activo: true },
      relations: { rol: true },
    });
    if (!usuario) {
      throw new UnauthorizedException('Usuario no válido');
    }
    const payload = { sub: usuario.id, usuario: usuario.usuario, rol: usuario.rol.nombreRol };
    return { accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }) };
  }
}
