import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Moneda } from '../entities/moneda.entity';
import { CrearMonedaDto } from '../dto/monedas/crear-moneda.dto';
import { ActualizarMonedaDto } from '../dto/monedas/actualizar-moneda.dto';

@Injectable()
export class MonedasService {
  constructor(
    @InjectRepository(Moneda)
    private readonly monedasRepo: Repository<Moneda>,
  ) {}

  listar() {
    return this.monedasRepo.find({ where: { activo: true } });
  }

  async obtenerPorId(id: number) {
    const moneda = await this.monedasRepo.findOne({ where: { id } });
    if (!moneda) throw new NotFoundException('Moneda no encontrada');
    return moneda;
  }

  async crear(dto: CrearMonedaDto) {
    const existente = await this.monedasRepo.findOne({ where: { codigo: dto.codigo } });
    if (existente) throw new ConflictException('Ya existe una moneda con ese código');
    const moneda = this.monedasRepo.create(dto);
    return this.monedasRepo.save(moneda);
  }

  async actualizar(id: number, dto: ActualizarMonedaDto) {
    const moneda = await this.obtenerPorId(id);
    Object.assign(moneda, dto);
    return this.monedasRepo.save(moneda);
  }

  async desactivar(id: number) {
    const moneda = await this.obtenerPorId(id);
    moneda.activo = false;
    return this.monedasRepo.save(moneda);
  }
}
