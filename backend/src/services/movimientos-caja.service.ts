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
    billetes?: Record<string, number> | null;
  }) {
    const movimiento = this.movimientosRepo.create({
      corte: { id: datos.idCorte } as any,
      usuario: { id: datos.idUsuario } as any,
      tipoMovimiento: datos.tipoMovimiento,
      moneda: datos.moneda,
      monto: datos.monto.toFixed(4),
      concepto: datos.concepto,
      billetes: datos.billetes ?? null,
    });
    return this.movimientosRepo.save(movimiento);
  }

  async listarPorCorte(idCorte: number, soloDeUsuario?: number) {
    return this.movimientosRepo.find({
      where: {
        corte: { id: idCorte },
        ...(soloDeUsuario !== undefined ? { usuario: { id: soloDeUsuario } } : {}),
      },
      relations: { usuario: true },
      order: { fechaHora: 'ASC' },
    });
  }
}
