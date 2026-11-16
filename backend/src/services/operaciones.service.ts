import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, IsNull } from 'typeorm';
import Decimal from 'decimal.js';
import { Operacion, TipoOperacion } from '../entities/operacion.entity';
import { CrearOperacionDto } from '../dto/operaciones/crear-operacion.dto';
import { TiposCambioService } from './tipos-cambio.service';
import { MovimientosCajaService } from './movimientos-caja.service';
import { CorteCaja } from '../entities/corte-caja.entity';
import { MONEDA_BILLETES, inventarioBilletes, validarBilletes, verificarDisponibles } from '../common/billetes';

@Injectable()
export class OperacionesService {
  constructor(
    @InjectRepository(Operacion)
    private readonly operacionesRepo: Repository<Operacion>,
    private readonly tiposCambioService: TiposCambioService,
    @InjectRepository(CorteCaja)
    private readonly cortesRepo: Repository<CorteCaja>,
    private readonly movimientosCajaService: MovimientosCajaService,
  ) {}

  /**
   * Billetes de USD que debería tener el usuario en su caja abierta, o null si
   * no tiene caja abierta o el inventario no está completo (no se puede validar).
   */
  private async billetesDisponibles(idUsuario: number) {
    const corte = await this.cortesRepo.findOne({
      where: { usuario: { id: idUsuario }, fechaCierre: IsNull() },
    });
    if (!corte) return null;
    const [operaciones, movimientos] = await Promise.all([
      this.desde(idUsuario, corte.fechaApertura),
      this.movimientosCajaService.listarPorCorte(corte.id),
    ]);
    const inv = inventarioBilletes(
      corte.billetesIniciales,
      operaciones.map((op) => ({
        tipoOperacion: op.tipoOperacion,
        codigo: op.moneda.codigo.toUpperCase(),
        billetes: op.billetes,
      })),
      movimientos,
    );
    return inv.completo ? inv.billetes : null;
  }

  async listar(filtros: {
    fechaInicio?: Date;
    fechaFin?: Date;
    idCliente?: number;
    idUsuario?: number;
  }) {
    return this.operacionesRepo.find({
      where: {
        ...(filtros.fechaInicio && filtros.fechaFin
          ? { fechaHora: Between(filtros.fechaInicio, filtros.fechaFin) }
          : {}),
        ...(filtros.idCliente ? { cliente: { id: filtros.idCliente } } : {}),
        ...(filtros.idUsuario ? { usuario: { id: filtros.idUsuario } } : {}),
      },
      relations: { cliente: true, usuario: true, moneda: true },
      order: { fechaHora: 'DESC' },
    });
  }

  /** Si se indica `soloDeUsuario`, la operación debe ser de ese usuario (si no, 404). */
  async obtenerPorId(id: number, soloDeUsuario?: number) {
    const operacion = await this.operacionesRepo.findOne({
      where: { id },
      relations: { cliente: true, usuario: true, moneda: true, tipoCambio: true },
    });
    if (!operacion || (soloDeUsuario !== undefined && operacion.usuario?.id !== soloDeUsuario)) {
      throw new NotFoundException('Operación no encontrada');
    }
    return operacion;
  }

  /**
   * Punto crítico de seguridad: el tipo de cambio y el importe total
   * SIEMPRE se calculan aquí, tomando el tipo de cambio vigente del
   * servidor. Nunca se aceptan esos valores desde el DTO/cliente.
   */
  async crear(dto: CrearOperacionDto, idUsuario: number) {
    const tipoCambioVigente = await this.tiposCambioService.actualPorMoneda(dto.idMoneda);

    const tasa =
      dto.tipoOperacion === TipoOperacion.COMPRA
        ? tipoCambioVigente.tipoCambioCompra
        : tipoCambioVigente.tipoCambioVenta;

    const cantidad = new Decimal(dto.cantidadDivisa);
    if (cantidad.lte(0)) {
      throw new BadRequestException('La cantidad debe ser mayor a cero');
    }
    const importeTotal = cantidad.mul(tasa);

    // Dólares: qué billetes entraron (compra) o salieron (venta) de la caja.
    let billetes: Record<string, number> | null = null;
    const esUsd = tipoCambioVigente.moneda?.codigo?.toUpperCase() === MONEDA_BILLETES;
    if (esUsd && dto.billetes) {
      if (!cantidad.isInteger()) {
        throw new BadRequestException('Los dólares se operan en billetes: usa una cantidad entera');
      }
      billetes = validarBilletes(dto.billetes, 'billetes', cantidad);
      if (dto.tipoOperacion === TipoOperacion.VENTA) {
        const disponibles = await this.billetesDisponibles(idUsuario);
        if (disponibles) verificarDisponibles(disponibles, billetes);
      }
    }

    const nueva = this.operacionesRepo.create({
      cliente: { id: dto.idCliente } as any,
      usuario: { id: idUsuario } as any,
      moneda: { id: dto.idMoneda } as any,
      tipoCambio: { id: tipoCambioVigente.id } as any,
      tipoOperacion: dto.tipoOperacion,
      cantidadDivisa: cantidad.toFixed(4),
      tipoCambioAplicado: new Decimal(tasa).toFixed(4),
      importeTotal: importeTotal.toFixed(4),
      billetes,
    });

    return this.operacionesRepo.save(nueva);
  }

  /** Operaciones de un usuario desde una fecha (con su moneda), para calcular la caja. */
  desde(idUsuario: number, fecha: Date) {
    return this.operacionesRepo.find({
      where: { usuario: { id: idUsuario }, fechaHora: MoreThanOrEqual(fecha) },
      relations: { moneda: true },
    });
  }

  /** Totales del día en curso para un usuario, usados al cerrar el corte. */
  async resumenDia(idUsuario: number, fecha: Date = new Date()) {
    const inicio = new Date(fecha);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(fecha);
    fin.setHours(23, 59, 59, 999);

    const operaciones = await this.operacionesRepo.find({
      where: { usuario: { id: idUsuario }, fechaHora: Between(inicio, fin) },
    });

    const totales = operaciones.reduce(
      (acc, op) => {
        const importe = new Decimal(op.importeTotal);
        if (op.tipoOperacion === TipoOperacion.COMPRA) {
          acc.totalCompras = acc.totalCompras.plus(importe);
        } else {
          acc.totalVentas = acc.totalVentas.plus(importe);
        }
        return acc;
      },
      { totalCompras: new Decimal(0), totalVentas: new Decimal(0) },
    );

    return {
      totalCompras: totales.totalCompras.toFixed(4),
      totalVentas: totales.totalVentas.toFixed(4),
      cantidadOperaciones: operaciones.length,
    };
  }
}
