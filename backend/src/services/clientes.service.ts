import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Cliente } from '../entities/cliente.entity';
import { Operacion } from '../entities/operacion.entity';
import { CrearClienteDto } from '../dto/clientes/crear-cliente.dto';
import { ActualizarClienteDto } from '../dto/clientes/actualizar-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clientesRepo: Repository<Cliente>,
    @InjectRepository(Operacion)
    private readonly operacionesRepo: Repository<Operacion>,
  ) {}

  async listar(busqueda?: string, pagina = 1, limite = 20) {
    const [datos, total] = await this.clientesRepo.findAndCount({
      where: {
        activo: true,
        ...(busqueda ? { nombre: Like(`%${busqueda}%`) } : {}),
      },
      skip: (pagina - 1) * limite,
      take: limite,
      order: { fechaRegistro: 'DESC' },
    });
    return { datos, total, pagina, limite };
  }

  async obtenerPorId(id: number) {
    const cliente = await this.clientesRepo.findOne({ where: { id } });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return cliente;
  }

  async crear(dto: CrearClienteDto) {
    const existente = await this.clientesRepo.findOne({
      where: { identificacion: dto.identificacion },
    });
    if (existente) throw new ConflictException('Ya existe un cliente con esa identificación');
    const cliente = this.clientesRepo.create(dto);
    return this.clientesRepo.save(cliente);
  }

  async actualizar(id: number, dto: ActualizarClienteDto) {
    const cliente = await this.obtenerPorId(id);
    Object.assign(cliente, dto);
    return this.clientesRepo.save(cliente);
  }

  async desactivar(id: number) {
    const cliente = await this.obtenerPorId(id);
    cliente.activo = false;
    return this.clientesRepo.save(cliente);
  }

  async historialOperaciones(idCliente: number) {
    await this.obtenerPorId(idCliente); // valida que exista
    return this.operacionesRepo.find({
      where: { cliente: { id: idCliente } },
      relations: { usuario: true, moneda: true, tipoCambio: true },
      order: { fechaHora: 'DESC' },
    });
  }
}
