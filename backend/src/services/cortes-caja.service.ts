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
import { AbrirCorteDto } from '../dto/cortes-caja/abrir-corte.dto';
import { CerrarCorteDto } from '../dto/cortes-caja/cerrar-corte.dto';
import { CrearMovimientoCajaDto } from '../dto/movimientos-caja/crear-movimiento-caja.dto';
import { OperacionesService } from './operaciones.service';
import { MovimientosCajaService } from './movimientos-caja.service';
import { saldosEsperados } from '../common/saldos-caja';
import {
  DENOMINACIONES,
  MONEDA_BILLETES,
  inventarioBilletes,
  totalBilletes,
  validarBilletes,
  verificarDisponibles,
} from '../common/billetes';

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
    const operaciones = await this.operacionesService.desde(idUsuario, corte.fechaApertura);
    const movimientos = await this.movimientosCajaService.listarPorCorte(corte.id);
    // Mismo cálculo que usa OperacionesService para validar (ver common/saldos-caja.ts).
    const { saldos, reserva, totalCompras, totalVentas } = saldosEsperados(
      corte,
      operaciones,
      movimientos,
    );

    // Billetes de USD por denominación (ver common/billetes.ts).
    const billetes = inventarioBilletes(
      corte.billetesIniciales,
      operaciones.map((op) => ({
        tipoOperacion: op.tipoOperacion,
        codigo: op.moneda.codigo.toUpperCase(),
        billetes: op.billetes,
      })),
      movimientos,
    );

    return { saldos, reserva, totalCompras, totalVentas, movimientos, billetes };
  }

  /** Corte + saldos esperados + movimientos, listo para la pantalla de Caja. */
  private async detalle(corte: CorteCaja, idUsuario: number) {
    const { saldos, reserva, movimientos, billetes } = await this.calcularEsperados(corte, idUsuario);
    const { usuario: _u, ...datos } = corte as any;
    return {
      ...datos,
      esperados: { ...this.aTexto(saldos), [RESERVA]: reserva.toFixed(4) },
      // Billetes de USD que debería haber. Si `completo` es false, alguna operación
      // o movimiento de USD no trae el detalle y el inventario es aproximado.
      billetes: { esperados: billetes.billetes, completo: billetes.completo, total: billetes.total },
      movimientos: movimientos.map((m) => ({
        id: m.id,
        tipoMovimiento: m.tipoMovimiento,
        moneda: m.moneda,
        monto: m.monto,
        concepto: m.concepto,
        billetes: m.billetes ?? null,
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

    const saldosIniciales = this.mapaMonedas(dto.saldosIniciales, 'saldosIniciales');
    // Si se mandan los billetes de USD, deben sumar el saldo inicial de USD.
    let billetesIniciales: Record<string, number> | null = null;
    if (dto.billetesIniciales) {
      billetesIniciales = validarBilletes(
        dto.billetesIniciales,
        'billetesIniciales',
        saldosIniciales[MONEDA_BILLETES] ?? totalBilletes(dto.billetesIniciales),
      );
      saldosIniciales[MONEDA_BILLETES] = new Decimal(totalBilletes(billetesIniciales));
    }

    const nuevo = this.cortesRepo.create({
      usuario: { id: idUsuario } as any,
      fechaApertura: new Date(),
      efectivoInicial: this.dinero(dto.efectivoInicial, 'efectivoInicial').toFixed(4),
      reservaInicial: this.dinero(dto.reservaInicial, 'reservaInicial').toFixed(4),
      saldosIniciales: this.aTexto(saldosIniciales),
      billetesIniciales,
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

    const { saldos, reserva, billetes: inventario } = await this.calcularEsperados(corte, idUsuario);

    // Entradas y salidas de USD: qué billetes entran o salen.
    let billetes: Record<string, number> | null = null;
    if (!reposicion && moneda === MONEDA_BILLETES && dto.billetes) {
      if (!monto.isInteger()) {
        throw new BadRequestException('Los dólares se manejan en billetes: usa un monto entero');
      }
      billetes = validarBilletes(dto.billetes, 'billetes', monto);
      if (dto.tipoMovimiento === TipoMovimiento.SALIDA && inventario.completo) {
        verificarDisponibles(inventario.billetes, billetes);
      }
    }

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
      billetes,
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

    // Billetes de USD contados: deben sumar el USD contado (si se mandó).
    let billetesFinales: Record<string, number> | null = null;
    if (dto.billetesFinales) {
      billetesFinales = validarBilletes(
        dto.billetesFinales,
        'billetesFinales',
        contadas[MONEDA_BILLETES] ?? totalBilletes(dto.billetesFinales),
      );
      contadas[MONEDA_BILLETES] = new Decimal(totalBilletes(billetesFinales));
    }

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

    // Diferencia por billete (contado - esperado). Solo si el inventario está
    // completo; si no, no se sabe con certeza cuántos de cada uno debía haber.
    corte.billetesFinales = billetesFinales;
    corte.diferenciasBilletes =
      billetesFinales && esperado.billetes.completo
        ? Object.fromEntries(
            DENOMINACIONES.map((d) => [
              String(d),
              (billetesFinales[String(d)] ?? 0) - (esperado.billetes.billetes[String(d)] ?? 0),
            ]),
          )
        : null;

    const { usuario: _u, ...guardado } = (await this.cortesRepo.save(corte)) as any;
    return guardado;
  }
}
