import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rol } from '../entities/rol.entity';
import { CrearRolDto } from '../dto/roles/crear-rol.dto';
import { ActualizarRolDto } from '../dto/roles/actualizar-rol.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Rol)
    private readonly rolesRepo: Repository<Rol>,
  ) {}

  listar() {
    return this.rolesRepo.find({ where: { activo: true } });
  }

  async crear(dto: CrearRolDto) {
    const existente = await this.rolesRepo.findOne({ where: { nombreRol: dto.nombreRol } });
    if (existente) throw new ConflictException('Ya existe un rol con ese nombre');
    const rol = this.rolesRepo.create(dto);
    return this.rolesRepo.save(rol);
  }

  async actualizar(id: number, dto: ActualizarRolDto) {
    const rol = await this.rolesRepo.findOne({ where: { id } });
    if (!rol) throw new NotFoundException('Rol no encontrado');
    Object.assign(rol, dto);
    return this.rolesRepo.save(rol);
  }
}
