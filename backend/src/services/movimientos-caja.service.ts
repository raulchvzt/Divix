import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { MovimientoCaja, TipoMovimiento } from '../entities/movimiento-caja.entity';
import { CrearMovimientoCajaDto } from '../dto/movimientos-caja/crear-movimiento-caja.dto';

@Injectable()
export class MovimientosCajaService {
  constructor(
    @InjectRepository(MovimientoCaja)
    private readonly movimientosRepo: Repository<MovimientoCaja>,
  ) {}

  async registrar(idCorte: number, dto: CrearMovimientoCajaDto, idUsuario: number) {
    const monto = new Decimal(dto.monto);
    if (monto.lte(0)) {
      throw new BadRequestException('El monto debe ser mayor a cero');
    }

    const movimiento = this.movimientosRepo.create({
      corte: { id: idCorte } as any,
      usuario: { id: idUsuario } as any,
      tipoMovimiento: dto.tipoMovimiento,
      monto: monto.toFixed(4),
      concepto: dto.concepto,
    });

    return this.movimientosRepo.save(movimiento);
  }

  async listarPorCorte(idCorte: number) {
    return this.movimientosRepo.find({
      where: { corte: { id: idCorte } },
      relations: { usuario: true },
      order: { fechaHora: 'ASC' },
    });
  }

  /** Suma neta (entradas - salidas) de un corte; usado al cerrarlo. */
  async netoPorCorte(idCorte: number) {
    const movimientos = await this.listarPorCorte(idCorte);
    return movimientos.reduce((acc, mov) => {
      const monto = new Decimal(mov.monto);
      return mov.tipoMovimiento === TipoMovimiento.ENTRADA ? acc.plus(monto) : acc.minus(monto);
    }, new Decimal(0));
  }
}
