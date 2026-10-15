import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { TipoCambio } from '../entities/tipo-cambio.entity';
import { Moneda } from '../entities/moneda.entity';
import { CrearTipoCambioDto } from '../dto/tipos-cambio/crear-tipo-cambio.dto';

@Injectable()
export class TiposCambioService {
  constructor(
    @InjectRepository(TipoCambio)
    private readonly tiposCambioRepo: Repository<TipoCambio>,
    @InjectRepository(Moneda)
    private readonly monedasRepo: Repository<Moneda>,
  ) {}

  /** Último tipo de cambio vigente de cada moneda activa. */
  async actual() {
    const monedas = await this.monedasRepo.find({ where: { activo: true } });
    const vigentes = await Promise.all(
      monedas.map((moneda) =>
        this.tiposCambioRepo.findOne({
          where: { moneda: { id: moneda.id } },
          order: { fechaVigencia: 'DESC' },
          relations: { moneda: true },
        }),
      ),
    );
    return vigentes.filter((tc): tc is TipoCambio => tc !== null);
  }

  async actualPorMoneda(idMoneda: number) {
    const tipoCambio = await this.tiposCambioRepo.findOne({
      where: { moneda: { id: idMoneda } },
      order: { fechaVigencia: 'DESC' },
      relations: { moneda: true },
    });
    if (!tipoCambio) {
      throw new NotFoundException('No hay tipo de cambio registrado para esta moneda');
    }
    return tipoCambio;
  }

  async historialPorMoneda(idMoneda: number, limite = 90) {
    return this.tiposCambioRepo.find({
      where: { moneda: { id: idMoneda } },
      order: { fechaVigencia: 'DESC' },
      take: limite,
    });
  }

  async crear(dto: CrearTipoCambioDto, idUsuario: number) {
    const compra = new Decimal(dto.tipoCambioCompra);
    const venta = new Decimal(dto.tipoCambioVenta);

    if (compra.lte(0) || venta.lte(0)) {
      throw new BadRequestException('Los tipos de cambio deben ser mayores a cero');
    }
    if (compra.gt(venta)) {
      throw new BadRequestException('El tipo de cambio de compra no puede ser mayor al de venta');
    }

    const nuevo = this.tiposCambioRepo.create({
      moneda: { id: dto.idMoneda } as any,
      tipoCambioCompra: compra.toFixed(4),
      tipoCambioVenta: venta.toFixed(4),
      usuario: { id: idUsuario } as any,
    });

    return this.tiposCambioRepo.save(nuevo);
  }
}
