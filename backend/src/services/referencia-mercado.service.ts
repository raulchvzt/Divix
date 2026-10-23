import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { TipoCambioReferencia } from '../entities/tipo-cambio-referencia.entity';
import { TiposCambioService } from './tipos-cambio.service';

const FUENTE = 'frankfurter';
const DIAS_HISTORIAL = 40; // lo necesario para variaciones de 7 y 30 días
const CADA_CUANTO_MS = 12 * 60 * 60 * 1000; // antigüedad máxima de lo descargado
const REVISAR_CADA_MS = 60 * 60 * 1000;
const ESPERA_INICIAL_MS = 15_000; // deja terminar el arranque (y la base JSON de prueba)

type Fila = { fecha: string; valor: string };

const isoDia = (d: Date) => d.toLocaleDateString('en-CA');
const sumarDias = (fecha: string, dias: number) => {
  const d = new Date(`${fecha}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return isoDia(d);
};

/**
 * Descarga una vez al día los tipos de cambio de referencia (Frankfurter, sin clave),
 * los guarda y los resume para el asistente. Si la fuente falla, la app sigue funcionando
 * con lo último que se guardó.
 */
@Injectable()
export class ReferenciaMercadoService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('ReferenciaMercado');
  private temporizador?: NodeJS.Timeout;

  constructor(
    @InjectRepository(TipoCambioReferencia)
    private readonly repo: Repository<TipoCambioReferencia>,
    private readonly tiposCambioService: TiposCambioService,
  ) {}

  private get activa() {
    return (process.env.REFERENCIA_MERCADO ?? 'on').toLowerCase() !== 'off';
  }
  private get baseUrl() {
    return (process.env.FRANKFURTER_URL ?? 'https://api.frankfurter.dev').replace(/\/$/, '');
  }

  onModuleInit() {
    if (!this.activa) {
      this.log.warn('Referencia de mercado desactivada (REFERENCIA_MERCADO=off).');
      return;
    }
    // No bloquea el arranque; los fallos solo se registran.
    const inicial = setTimeout(() => void this.sincronizarSiHaceFalta(), ESPERA_INICIAL_MS);
    inicial.unref();
    this.temporizador = setInterval(() => void this.sincronizarSiHaceFalta(), REVISAR_CADA_MS);
    this.temporizador.unref();
  }

  onModuleDestroy() {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  private async sincronizarSiHaceFalta() {
    try {
      const ultimas = await this.repo.find({ order: { fechaConsulta: 'DESC' }, take: 1 });
      const ultima = ultimas[0]?.fechaConsulta ? new Date(ultimas[0].fechaConsulta).getTime() : 0;
      if (Date.now() - ultima < CADA_CUANTO_MS) return;
      await this.sincronizar();
    } catch (e) {
      this.log.error(`No se pudo sincronizar: ${(e as Error).message}`);
    }
  }

  // ---------- descarga ----------

  private async pedir(url: string) {
    const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
    return r.json();
  }

  /**
   * Acepta las dos formas de respuesta de Frankfurter:
   *  - v2: lista de filas { date, base, quote, rate }
   *  - v1: { rates: { "2026-10-01": { MXN: 18.2 }, ... } }  o  { date, rates: { MXN: 18.2 } }
   */
  private extraerFilas(json: any): Fila[] {
    const filas: Fila[] = [];
    const lista = Array.isArray(json) ? json : Array.isArray(json?.rates) ? json.rates : null;
    if (lista) {
      for (const f of lista) {
        const quote = f.quote ?? f.symbol ?? 'MXN';
        if (f.date && f.rate != null && String(quote).toUpperCase() === 'MXN') {
          filas.push({ fecha: String(f.date).slice(0, 10), valor: String(f.rate) });
        }
      }
      return filas;
    }
    const rates = json?.rates;
    if (rates && typeof rates === 'object') {
      const primero = Object.values(rates)[0];
      if (primero && typeof primero === 'object') {
        for (const [fecha, monedas] of Object.entries<any>(rates)) {
          if (monedas?.MXN != null) filas.push({ fecha, valor: String(monedas.MXN) });
        }
      } else if (rates.MXN != null && json.date) {
        filas.push({ fecha: String(json.date), valor: String(rates.MXN) });
      }
    }
    return filas;
  }

  private async descargar(moneda: string, desde: string): Promise<Fila[]> {
    const urls = [
      `${this.baseUrl}/v2/rates?from=${desde}&base=${moneda}&quotes=MXN`,
      `${this.baseUrl}/v1/${desde}..?base=${moneda}&symbols=MXN`,
    ];
    let ultimoError: Error | undefined;
    for (const url of urls) {
      try {
        const filas = this.extraerFilas(await this.pedir(url));
        if (filas.length) return filas;
        ultimoError = new Error(`Respuesta sin datos MXN en ${url}`);
      } catch (e) {
        ultimoError = e as Error;
      }
    }
    throw ultimoError!;
  }

  /** Descarga el historial reciente de cada moneda con tipo de cambio y guarda lo que falte. */
  async sincronizar() {
    const vigentes = await this.tiposCambioService.actual();
    const monedas = [...new Set(vigentes.map((t) => t.moneda.codigo.toUpperCase()))].filter(
      (c) => c !== 'MXN',
    );
    const desde = sumarDias(isoDia(new Date()), -DIAS_HISTORIAL);
    const resultado: { moneda: string; nuevas: number; error?: string }[] = [];

    for (const moneda of monedas) {
      try {
        const filas = await this.descargar(moneda, desde);
        const existentes = await this.repo.find({ where: { fuente: FUENTE, moneda } });
        const ya = new Set(existentes.map((e) => e.fecha));
        let nuevas = 0;
        for (const f of filas) {
          if (ya.has(f.fecha)) continue;
          const valor = new Decimal(f.valor);
          if (!valor.isFinite() || valor.lte(0)) continue;
          await this.repo.save(
            this.repo.create({ fuente: FUENTE, moneda, fecha: f.fecha, valorMxn: valor.toFixed(6) }),
          );
          nuevas++;
        }
        resultado.push({ moneda, nuevas });
      } catch (e) {
        const mensaje = (e as Error).message;
        this.log.warn(`${moneda}: no se pudo descargar la referencia (${mensaje})`);
        resultado.push({ moneda, nuevas: 0, error: mensaje });
      }
    }
    this.log.log(`Sincronización: ${resultado.map((r) => `${r.moneda}+${r.nuevas}`).join(', ') || 'sin monedas'}`);
    return resultado;
  }

  // ---------- resumen ----------

  /**
   * Por moneda: último valor de referencia, variación 7 y 30 días, rango de 30 días
   * y comparación con los precios de este negocio. Devuelve null si aún no hay datos.
   */
  async resumen() {
    const vigentes = await this.tiposCambioService.actual();
    const salida: any[] = [];

    for (const t of vigentes) {
      const moneda = t.moneda.codigo.toUpperCase();
      if (moneda === 'MXN') continue;
      const filas = await this.repo.find({
        where: { fuente: FUENTE, moneda },
        order: { fecha: 'DESC' },
        take: 60,
      });
      if (!filas.length) continue;

      const ultimo = filas[0];
      const valor = new Decimal(ultimo.valorMxn);
      const hace = (dias: number) => {
        const objetivo = sumarDias(ultimo.fecha, -dias);
        return filas.find((f) => f.fecha <= objetivo);
      };
      const variacion = (dias: number) => {
        const f = hace(dias);
        if (!f) return null;
        const base = new Decimal(f.valorMxn);
        return valor.minus(base).div(base).mul(100).toFixed(2); // %
      };
      const ventana = filas.filter((f) => f.fecha >= sumarDias(ultimo.fecha, -30));
      const valores = ventana.map((f) => new Decimal(f.valorMxn));
      const compra = new Decimal(t.tipoCambioCompra);
      const venta = new Decimal(t.tipoCambioVenta);

      salida.push({
        moneda,
        fuente: 'Frankfurter (referencia de bancos centrales, no precio de ventanilla)',
        referencia_mxn: valor.toFixed(4),
        fecha_referencia: ultimo.fecha,
        variacion_7_dias_pct: variacion(7),
        variacion_30_dias_pct: variacion(30),
        minimo_30_dias: valores.length ? Decimal.min(...valores).toFixed(4) : null,
        maximo_30_dias: valores.length ? Decimal.max(...valores).toFixed(4) : null,
        tu_precio: {
          compra: compra.toFixed(4),
          venta: venta.toFixed(4),
          compra_vs_referencia: compra.minus(valor).toFixed(4),
          venta_vs_referencia: venta.minus(valor).toFixed(4),
        },
      });
    }
    return salida.length ? salida : null;
  }
}
