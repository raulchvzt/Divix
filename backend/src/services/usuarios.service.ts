import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../entities/usuario.entity';
import { CrearUsuarioDto } from '../dto/usuarios/crear-usuario.dto';
import { ActualizarUsuarioDto } from '../dto/usuarios/actualizar-usuario.dto';
import { CambiarPasswordDto } from '../dto/usuarios/cambiar-password.dto';

const RONDAS_SALT = 10;

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
  ) {}

  async listar(pagina = 1, limite = 20) {
    const [datos, total] = await this.usuariosRepo.findAndCount({
      relations: { rol: true },
      where: { activo: true },
      skip: (pagina - 1) * limite,
      take: limite,
      order: { fechaRegistro: 'DESC' },
    });
    return { datos, total, pagina, limite };
  }

  async obtenerPorId(id: number) {
    const usuario = await this.usuariosRepo.findOne({
      where: { id },
      relations: { rol: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  async crear(dto: CrearUsuarioDto) {
    const existente = await this.usuariosRepo.findOne({ where: { usuario: dto.usuario } });
    if (existente) {
      throw new ConflictException('El nombre de usuario ya está en uso');
    }

    const contrasenaHash = await bcrypt.hash(dto.contrasena, RONDAS_SALT);

    const nuevo = this.usuariosRepo.create({
      nombre: dto.nombre,
      apellidoPaterno: dto.apellidoPaterno,
      apellidoMaterno: dto.apellidoMaterno,
      usuario: dto.usuario,
      contrasenaHash,
      rol: { id: dto.idRol } as any,
    });

    const guardado = await this.usuariosRepo.save(nuevo);
    // save() devuelve la entidad tal como la armamos, con el hash incluido:
    // se quita para que nunca viaje en la respuesta HTTP.
    const { contrasenaHash: _hash, ...sinHash } = guardado;
    return sinHash;
  }

  async actualizar(id: number, dto: ActualizarUsuarioDto) {
    const usuario = await this.obtenerPorId(id);
    Object.assign(usuario, {
      ...dto,
      rol: dto.idRol ? ({ id: dto.idRol } as any) : usuario.rol,
    });
    return this.usuariosRepo.save(usuario);
  }

  async desactivar(id: number) {
    const usuario = await this.obtenerPorId(id);
    usuario.activo = false;
    return this.usuariosRepo.save(usuario);
  }

  async cambiarPassword(id: number, dto: CambiarPasswordDto) {
    const usuario = await this.usuariosRepo
      .createQueryBuilder('usuario')
      .addSelect('usuario.contrasenaHash')
      .where('usuario.id = :id', { id })
      .getOne();

    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const coincide = await bcrypt.compare(dto.contrasenaActual, usuario.contrasenaHash);
    if (!coincide) throw new BadRequestException('La contraseña actual no es correcta');

    usuario.contrasenaHash = await bcrypt.hash(dto.contrasenaNueva, RONDAS_SALT);
    await this.usuariosRepo.save(usuario);
    return { mensaje: 'Contraseña actualizada correctamente' };
  }
}
