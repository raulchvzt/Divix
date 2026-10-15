import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { MovimientoCaja, TipoMovimiento } from '../entities/movimiento-caja.entity';

@Injectable()
export class MovimientosCajaService {
  constructor(
    @InjectRepository(MovimientoCaja)
    private readonly movimientosRepo: Repository<MovimientoCaja>,
  ) {}

  /**
   * Solo guarda. Las reglas (corte abierto, no dejar saldos negativos, etc.)
   * las valida CortesCajaService.registrarMovimiento, que es la puerta de entrada.
   */
  async guardar(datos: {
    idCorte: number;
    idUsuario: number;
    tipoMovimiento: TipoMovimiento;
    moneda: string;
    monto: Decimal;
    concepto: string;
  }) {
    const movimiento = this.movimientosRepo.create({
      corte: { id: datos.idCorte } as any,
      usuario: { id: datos.idUsuario } as any,
      tipoMovimiento: datos.tipoMovimiento,
      moneda: datos.moneda,
      monto: datos.monto.toFixed(4),
      concepto: datos.concepto,
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
}
