import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { CorteCaja } from '../entities/corte-caja.entity';
import { AbrirCorteDto } from '../dto/cortes-caja/abrir-corte.dto';
import { CerrarCorteDto } from '../dto/cortes-caja/cerrar-corte.dto';
import { OperacionesService } from './operaciones.service';
import { MovimientosCajaService } from './movimientos-caja.service';

@Injectable()
export class CortesCajaService {
  constructor(
    @InjectRepository(CorteCaja)
    private readonly cortesRepo: Repository<CorteCaja>,
    private readonly operacionesService: OperacionesService,
    private readonly movimientosCajaService: MovimientosCajaService,
  ) {}

  async corteActivo(idUsuario: number) {
    const corte = await this.cortesRepo.findOne({
      where: { usuario: { id: idUsuario }, fechaCierre: IsNull() },
    });
    if (!corte) throw new NotFoundException('No hay un corte abierto para este usuario');
    return corte;
  }

  async abrir(dto: AbrirCorteDto, idUsuario: number) {
    const existente = await this.cortesRepo.findOne({
      where: { usuario: { id: idUsuario }, fechaCierre: IsNull() },
    });
    if (existente) {
      throw new ConflictException('Ya existe un corte abierto para este usuario');
    }

    const nuevo = this.cortesRepo.create({
      usuario: { id: idUsuario } as any,
      fechaApertura: new Date(),
      efectivoInicial: new Decimal(dto.efectivoInicial).toFixed(4),
    });

    return this.cortesRepo.save(nuevo);
  }

  async listar(filtros: { idUsuario?: number }) {
    return this.cortesRepo.find({
      where: filtros.idUsuario ? { usuario: { id: filtros.idUsuario } } : {},
      relations: { usuario: true },
      order: { fechaApertura: 'DESC' },
    });
  }

  async obtenerPorId(id: number) {
    const corte = await this.cortesRepo.findOne({
      where: { id },
      relations: { usuario: true, movimientos: { usuario: true } },
    });
    if (!corte) throw new NotFoundException('Corte no encontrado');
    return corte;
  }

  /**
   * Congela los totales del corte: se calculan aquí, una sola vez, a
   * partir de Operaciones y MovimientosCaja. Después de este punto
   * estos campos nunca se recalculan ni se editan manualmente.
   */
  async cerrar(id: number, dto: CerrarCorteDto, idUsuario: number) {
    const corte = await this.cortesRepo.findOne({ where: { id } });
    if (!corte) throw new NotFoundException('Corte no encontrado');
    if (corte.fechaCierre) throw new ConflictException('Este corte ya está cerrado');

    const resumenOperaciones = await this.operacionesService.resumenDia(
      idUsuario,
      corte.fechaApertura,
    );
    const netoMovimientos = await this.movimientosCajaService.netoPorCorte(id);

    const efectivoInicial = new Decimal(corte.efectivoInicial);
    const totalVentas = new Decimal(resumenOperaciones.totalVentas);
    const totalCompras = new Decimal(resumenOperaciones.totalCompras);
    const efectivoFinalDeclarado = new Decimal(dto.efectivoFinal);

    // Efectivo esperado: inicial + ventas - compras + movimientos manuales
    const efectivoEsperado = efectivoInicial
      .plus(totalVentas)
      .minus(totalCompras)
      .plus(netoMovimientos);

    const diferencia = efectivoFinalDeclarado.minus(efectivoEsperado);

    corte.fechaCierre = new Date();
    corte.efectivoFinal = efectivoFinalDeclarado.toFixed(4);
    corte.totalCompras = totalCompras.toFixed(4);
    corte.totalVentas = totalVentas.toFixed(4);
    corte.diferenciaCaja = diferencia.toFixed(4);

    return this.cortesRepo.save(corte);
  }
}
