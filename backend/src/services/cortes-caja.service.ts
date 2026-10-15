import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { CorteCaja } from '../entities/corte-caja.entity';
import { TipoMovimiento } from '../entities/movimiento-caja.entity';
import { TipoOperacion } from '../entities/operacion.entity';
import { AbrirCorteDto } from '../dto/cortes-caja/abrir-corte.dto';
import { CerrarCorteDto } from '../dto/cortes-caja/cerrar-corte.dto';
import { CrearMovimientoCajaDto } from '../dto/movimientos-caja/crear-movimiento-caja.dto';
import { OperacionesService } from './operaciones.service';
import { MovimientosCajaService } from './movimientos-caja.service';

const MXN = 'MXN';
const RESERVA = 'reserva';

@Injectable()
export class CortesCajaService {
  constructor(
    @InjectRepository(CorteCaja)
    private readonly cortesRepo: Repository<CorteCaja>,
    private readonly operacionesService: OperacionesService,
    private readonly movimientosCajaService: MovimientosCajaService,
  ) {}

  // ---------- utilidades ----------

  private dinero(valor: string | number | undefined, campo: string): Decimal {
    let d: Decimal;
    try {
      d = new Decimal(valor ?? 0);
    } catch {
      throw new BadRequestException(`"${campo}" no es un número válido`);
    }
    if (!d.isFinite() || d.isNegative()) {
      throw new BadRequestException(`"${campo}" debe ser un número mayor o igual a cero`);
    }
    return d;
  }

  /** { usd: "10" } -> { USD: Decimal(10) }. Ignora MXN (va en su propio campo). */
  private mapaMonedas(mapa: Record<string, string> | undefined, campo: string) {
    const resultado: Record<string, Decimal> = {};
    for (const [codigo, valor] of Object.entries(mapa ?? {})) {
      const c = codigo.trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(c)) throw new BadRequestException(`Código de moneda inválido: "${codigo}"`);
      if (c === MXN) continue;
      resultado[c] = this.dinero(valor, `${campo}.${c}`);
    }
    return resultado;
  }

  private aTexto(mapa: Record<string, Decimal>): Record<string, string> {
    return Object.fromEntries(Object.entries(mapa).map(([k, v]) => [k, v.toFixed(4)]));
  }

  /**
   * Saldos que DEBERÍA haber ahora mismo, por moneda y en la caja fuerte:
   *   inicial
   *   ± operaciones del cajero desde la apertura (compra: sale MXN, entra divisa; venta: al revés)
   *   ± entradas / salidas manuales
   *   reposición: pasa pesos de la caja fuerte a la del cajero
   */
  async calcularEsperados(corte: CorteCaja, idUsuario: number) {
    const saldos: Record<string, Decimal> = { [MXN]: new Decimal(corte.efectivoInicial) };
    for (const [c, v] of Object.entries(corte.saldosIniciales ?? {})) {
      saldos[c.toUpperCase()] = new Decimal(v);
    }
    let reserva = new Decimal(corte.reservaInicial ?? 0);
    let totalCompras = new Decimal(0);
    let totalVentas = new Decimal(0);
    const suma = (c: string, v: Decimal) => {
      saldos[c] = (saldos[c] ?? new Decimal(0)).plus(v);
    };

    const operaciones = await this.operacionesService.desde(idUsuario, corte.fechaApertura);
    for (const op of operaciones) {
      const importe = new Decimal(op.importeTotal);
      const cantidad = new Decimal(op.cantidadDivisa);
      const codigo = op.moneda.codigo.toUpperCase();
      if (op.tipoOperacion === TipoOperacion.COMPRA) {
        totalCompras = totalCompras.plus(importe);
        suma(MXN, importe.neg());
        suma(codigo, cantidad);
      } else {
        totalVentas = totalVentas.plus(importe);
        suma(MXN, importe);
        suma(codigo, cantidad.neg());
      }
    }

    const movimientos = await this.movimientosCajaService.listarPorCorte(corte.id);
    for (const m of movimientos) {
      const monto = new Decimal(m.monto);
      const codigo = (m.moneda ?? MXN).toUpperCase();
      if (m.tipoMovimiento === TipoMovimiento.ENTRADA) suma(codigo, monto);
      else if (m.tipoMovimiento === TipoMovimiento.SALIDA) suma(codigo, monto.neg());
      else {
        reserva = reserva.minus(monto);
        suma(MXN, monto);
      }
    }

    return { saldos, reserva, totalCompras, totalVentas, movimientos };
  }

  /** Corte + saldos esperados + movimientos, listo para la pantalla de Caja. */
  private async detalle(corte: CorteCaja, idUsuario: number) {
    const { saldos, reserva, movimientos } = await this.calcularEsperados(corte, idUsuario);
    const { usuario: _u, ...datos } = corte as any;
    return {
      ...datos,
      esperados: { ...this.aTexto(saldos), [RESERVA]: reserva.toFixed(4) },
      movimientos: movimientos.map((m) => ({
        id: m.id,
        tipoMovimiento: m.tipoMovimiento,
        moneda: m.moneda,
        monto: m.monto,
        concepto: m.concepto,
        fechaHora: m.fechaHora,
      })),
    };
  }

  private async buscarPropio(id: number, idUsuario: number) {
    const corte = await this.cortesRepo.findOne({ where: { id }, relations: { usuario: true } });
    if (!corte) throw new NotFoundException('Corte no encontrado');
    if (corte.usuario?.id !== idUsuario) {
      throw new ForbiddenException('Este corte pertenece a otro usuario');
    }
    return corte;
  }

  // ---------- casos de uso ----------

  /** Corte abierto del usuario, o null si no tiene (no es un error). */
  async corteActivo(idUsuario: number) {
    const corte = await this.cortesRepo.findOne({
      where: { usuario: { id: idUsuario }, fechaCierre: IsNull() },
    });
    return corte ? this.detalle(corte, idUsuario) : null;
  }

  /** Último corte cerrado del usuario (sus saldos contados son la apertura siguiente), o null. */
  async ultimoCierre(idUsuario: number) {
    const cortes = await this.cortesRepo.find({
      where: { usuario: { id: idUsuario } },
      order: { fechaApertura: 'DESC' },
    });
    return cortes.find((c) => c.fechaCierre) ?? null;
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
      efectivoInicial: this.dinero(dto.efectivoInicial, 'efectivoInicial').toFixed(4),
      reservaInicial: this.dinero(dto.reservaInicial, 'reservaInicial').toFixed(4),
      saldosIniciales: this.aTexto(this.mapaMonedas(dto.saldosIniciales, 'saldosIniciales')),
    });

    const guardado = await this.cortesRepo.save(nuevo);
    return this.detalle(guardado, idUsuario);
  }

  async registrarMovimiento(idCorte: number, dto: CrearMovimientoCajaDto, idUsuario: number) {
    const corte = await this.buscarPropio(idCorte, idUsuario);
    if (corte.fechaCierre) throw new ConflictException('Este corte ya está cerrado');

    const monto = new Decimal(dto.monto);
    if (!monto.isFinite() || monto.lte(0)) {
      throw new BadRequestException('El monto debe ser mayor a cero');
    }

    const reposicion = dto.tipoMovimiento === TipoMovimiento.REPOSICION;
    const moneda = reposicion ? MXN : (dto.moneda ?? MXN).toUpperCase();
    const concepto = dto.concepto?.trim() || (reposicion ? 'Caja fuerte → cajero' : '');
    if (!concepto) throw new BadRequestException('Escribe el concepto del movimiento');

    const { saldos, reserva } = await this.calcularEsperados(corte, idUsuario);
    if (reposicion && monto.gt(reserva)) {
      throw new BadRequestException('La reposición no puede superar la reserva de caja fuerte');
    }
    if (dto.tipoMovimiento === TipoMovimiento.SALIDA && monto.gt(saldos[moneda] ?? 0)) {
      throw new BadRequestException(`No hay suficiente efectivo en ${moneda} para esa salida`);
    }

    return this.movimientosCajaService.guardar({
      idCorte,
      idUsuario,
      tipoMovimiento: dto.tipoMovimiento,
      moneda,
      monto,
      concepto,
    });
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
      relations: { usuario: true, movimientos: true },
    });
    if (!corte) throw new NotFoundException('Corte no encontrado');
    return corte;
  }

  /**
   * Cierra el corte con lo que el cajero contó. Las diferencias
   * (contado - esperado) se calculan aquí, una sola vez, y se congelan.
   */
  async cerrar(id: number, dto: CerrarCorteDto, idUsuario: number) {
    const corte = await this.buscarPropio(id, idUsuario);
    if (corte.fechaCierre) throw new ConflictException('Este corte ya está cerrado');

    const esperado = await this.calcularEsperados(corte, idUsuario);

    const mxnContado = this.dinero(dto.efectivoFinal, 'efectivoFinal');
    const reservaContada =
      dto.reservaFinal === undefined ? esperado.reserva : this.dinero(dto.reservaFinal, 'reservaFinal');
    const contadas = this.mapaMonedas(dto.saldosFinales, 'saldosFinales');

    // Monedas con saldo esperado que no se contaron: se asume que coinciden.
    const codigos = new Set([...Object.keys(esperado.saldos), ...Object.keys(contadas)]);
    codigos.delete(MXN);
    const saldosFinales: Record<string, Decimal> = {};
    for (const c of codigos) saldosFinales[c] = contadas[c] ?? esperado.saldos[c] ?? new Decimal(0);

    const diferencias: Record<string, Decimal> = {
      [MXN]: mxnContado.minus(esperado.saldos[MXN]),
      [RESERVA]: reservaContada.minus(esperado.reserva),
    };
    for (const c of codigos) diferencias[c] = saldosFinales[c].minus(esperado.saldos[c] ?? 0);

    corte.fechaCierre = new Date();
    corte.efectivoFinal = mxnContado.toFixed(4);
    corte.reservaFinal = reservaContada.toFixed(4);
    corte.saldosFinales = this.aTexto(saldosFinales);
    corte.totalCompras = esperado.totalCompras.toFixed(4);
    corte.totalVentas = esperado.totalVentas.toFixed(4);
    corte.diferencias = this.aTexto(diferencias);
    corte.diferenciaCaja = diferencias[MXN].toFixed(4);

    const { usuario: _u, ...guardado } = (await this.cortesRepo.save(corte)) as any;
    return guardado;
  }
}
