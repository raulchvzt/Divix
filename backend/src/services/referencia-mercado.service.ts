import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Decimal from 'decimal.js';
import { TiposCambioService } from './tipos-cambio.service';

/**
 * Tipo de cambio de REFERENCIA del mercado, para comparar contra los precios
 * que fija el dueño. El sistema NO cambia los precios: solo informa y sugiere.
 *
 * Fuentes:
 *  - USD: Banxico, tipo de cambio FIX (si hay BANXICO_TOKEN en el .env).
 *  - Las demás divisas, o USD sin token: Frankfurter (tipos de referencia del
 *    Banco Central Europeo, sin clave).
 *
 * Lo descargado se guarda en memoria y se renueva cada pocas horas, así que no
 * necesita tablas nuevas en la base de datos. Si la fuente falla, la app sigue
 * funcionando con lo último descargado (o sin referencia).
 *
 * Variables de entorno (todas opcionales):
 *  REFERENCIA_MERCADO=off       desactiva la consulta
 *  BANXICO_TOKEN                token del SIE de Banxico
 *  BANXICO_SERIE_USD=SF43718    serie del dólar FIX
 *  REFERENCIA_UMBRAL_PCT=1      % de movimiento del mercado a partir del cual se avisa
 */

const BANXICO = 'banxico';
const FRANKFURTER = 'frankfurter';
const DIAS_HISTORIAL = 40;
const VIGENCIA_MS = 6 * 60 * 60 * 1000; // cada cuánto se vuelve a descargar
const REINTENTO_MS = 10 * 60 * 1000; // si falló, cuánto esperar para reintentar

type Fila = { fecha: string; valor: Decimal };
type Historial = {
  fuente: string;
  filas: Fila[];
  descargado: number;
  error?: string;
};

const isoDia = (d: Date) => d.toLocaleDateString('en-CA');
const sumarDias = (fecha: string, dias: number) => {
  const d = new Date(`${fecha}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return isoDia(d);
};
const pct = (valor: Decimal, base: Decimal) =>
  valor.minus(base).div(base).mul(100);
/** Redondeo de precios: 2 decimales, o 4 para divisas que valen menos de un peso (p. ej. JPY). */
const redondear = (v: Decimal) => v.toDecimalPlaces(v.lt(1) ? 4 : 2).toFixed(4);

/** Margen mínimo por lado si los precios actuales no tienen margen (venta <= compra). */
const MARGEN_MINIMO = 0.015;

/**
 * Precios sugeridos. Nunca sugiere comprar arriba del mercado ni vender abajo.
 *  1. Si el mercado se movió y los precios del dueño estaban bien, conserva el
 *     mismo margen frente al mercado que tenía al ponerlos ("mantener_margen").
 *  2. Si eso dejaría los precios en pérdida (o ya lo están), centra el margen
 *     habitual del dueño (la distancia entre su compra y su venta) alrededor
 *     del precio del mercado ("centrar_en_mercado").
 */
function sugerirPrecios(
  compra: Decimal,
  venta: Decimal,
  mercado: Decimal,
  mercadoAlPoner: Decimal | null,
) {
  const enPerdida = (c: Decimal, v: Decimal) => c.gt(mercado) || v.lt(mercado);

  if (mercadoAlPoner && !mercadoAlPoner.eq(mercado)) {
    const c = compra.mul(mercado).div(mercadoAlPoner);
    const v = venta.mul(mercado).div(mercadoAlPoner);
    if (!enPerdida(c, v)) {
      return {
        compra: redondear(c),
        venta: redondear(v),
        motivo: 'mantener_margen' as const,
      };
    }
  }
  if (!enPerdida(compra, venta)) return null; // sin movimiento y sin pérdida: no hace falta

  // Margen por lado = mitad de la distancia entre compra y venta, en %.
  let margen = venta.minus(compra).div(venta.plus(compra));
  if (margen.lt(MARGEN_MINIMO)) margen = new Decimal(MARGEN_MINIMO);
  return {
    compra: redondear(mercado.mul(new Decimal(1).minus(margen))),
    venta: redondear(mercado.mul(new Decimal(1).plus(margen))),
    motivo: 'centrar_en_mercado' as const,
    margenPct: margen.mul(100).toDecimalPlaces(2).toNumber(),
  };
}

@Injectable()
export class ReferenciaMercadoService implements OnModuleInit {
  private readonly log = new Logger('ReferenciaMercado');
  private readonly cache = new Map<string, Historial>();
  private readonly enCurso = new Map<string, Promise<Historial>>();

  constructor(private readonly tiposCambioService: TiposCambioService) {}

  private get activa() {
    return (process.env.REFERENCIA_MERCADO ?? 'on').toLowerCase() !== 'off';
  }
  private get tokenBanxico() {
    return process.env.BANXICO_TOKEN?.trim() || '';
  }
  private get urlBanxico() {
    return (
      process.env.BANXICO_URL ??
      'https://www.banxico.org.mx/SieAPIRest/service/v1'
    ).replace(/\/$/, '');
  }
  private get serieUsd() {
    return process.env.BANXICO_SERIE_USD ?? 'SF43718';
  }
  private get urlFrankfurter() {
    return (
      process.env.FRANKFURTER_URL ?? 'https://api.frankfurter.dev'
    ).replace(/\/$/, '');
  }
  private get umbral() {
    const n = Number(process.env.REFERENCIA_UMBRAL_PCT ?? 1);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  onModuleInit() {
    if (!this.activa) {
      this.log.warn(
        'Referencia de mercado desactivada (REFERENCIA_MERCADO=off).',
      );
      return;
    }
    // Descarga en segundo plano para que la primera consulta ya sea rápida.
    const t = setTimeout(
      () => void this.comparativo().catch(() => undefined),
      5_000,
    );
    t.unref();
  }

  // ---------- descarga ----------

  private async pedirJson(url: string, headers: Record<string, string> = {}) {
    const r = await fetch(url, {
      headers: { Accept: 'application/json', ...headers },
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  /** Frankfurter: acepta la respuesta de v2 (lista de filas) y la de v1 ({ rates: { fecha: { MXN } } }). */
  private extraerFrankfurter(json: any): Fila[] {
    const filas: Fila[] = [];
    const agregar = (fecha: unknown, valor: unknown) => {
      const v = new Decimal(String(valor));
      if (typeof fecha === 'string' && fecha && v.isFinite() && v.gt(0))
        filas.push({ fecha: fecha.slice(0, 10), valor: v });
    };
    const lista = Array.isArray(json)
      ? json
      : Array.isArray(json?.rates)
        ? json.rates
        : null;
    if (lista) {
      for (const f of lista) {
        if (String(f.quote ?? 'MXN').toUpperCase() === 'MXN' && f.rate != null)
          agregar(f.date, f.rate);
      }
    } else if (json?.rates && typeof json.rates === 'object') {
      for (const [fecha, monedas] of Object.entries<any>(json.rates)) {
        if (monedas?.MXN != null) agregar(fecha, monedas.MXN);
        else if (fecha === 'MXN' && json.date) agregar(json.date, monedas);
      }
    }
    return filas;
  }

  private async descargarFrankfurter(
    moneda: string,
    desde: string,
  ): Promise<Fila[]> {
    const urls = [
      `${this.urlFrankfurter}/v2/rates?from=${desde}&base=${moneda}&quotes=MXN`,
      `${this.urlFrankfurter}/v1/${desde}..?base=${moneda}&symbols=MXN`,
    ];
    let ultimoError: Error = new Error('sin datos');
    for (const url of urls) {
      try {
        const filas = this.extraerFrankfurter(await this.pedirJson(url));
        if (filas.length) return filas;
      } catch (e) {
        ultimoError = e as Error;
      }
    }
    throw ultimoError;
  }

  private async descargarBanxico(desde: string): Promise<Fila[]> {
    const url = `${this.urlBanxico}/series/${this.serieUsd}/datos/${desde}/${isoDia(new Date())}`;
    const json = await this.pedirJson(url, { 'Bmx-Token': this.tokenBanxico });
    const filas: Fila[] = [];
    for (const d of json?.bmx?.series?.[0]?.datos ?? []) {
      const [dd, mm, aaaa] = String(d.fecha).split('/');
      const valor = String(d.dato).replace(/,/g, '');
      if (!aaaa || !/^\d+(\.\d+)?$/.test(valor)) continue; // "N/E" = sin dato ese día
      filas.push({ fecha: `${aaaa}-${mm}-${dd}`, valor: new Decimal(valor) });
    }
    if (!filas.length) throw new Error('Banxico no devolvió datos');
    return filas;
  }

  private async descargar(moneda: string): Promise<Historial> {
    const desde = sumarDias(isoDia(new Date()), -DIAS_HISTORIAL);
    const ordenar = (filas: Fila[]) =>
      filas.sort((a, b) => b.fecha.localeCompare(a.fecha));

    if (moneda === 'USD' && this.tokenBanxico) {
      try {
        return {
          fuente: BANXICO,
          filas: ordenar(await this.descargarBanxico(desde)),
          descargado: Date.now(),
        };
      } catch (e) {
        this.log.warn(
          `USD: Banxico falló (${(e as Error).message}); se usa Frankfurter.`,
        );
      }
    }
    return {
      fuente: FRANKFURTER,
      filas: ordenar(await this.descargarFrankfurter(moneda, desde)),
      descargado: Date.now(),
    };
  }

  /** Historial reciente de una moneda (de la memoria si está fresco). */
  private async historial(
    moneda: string,
    forzar = false,
  ): Promise<Historial | null> {
    const guardado = this.cache.get(moneda);
    const edad = guardado ? Date.now() - guardado.descargado : Infinity;
    const espera = guardado?.error ? REINTENTO_MS : VIGENCIA_MS;
    if (!forzar && guardado && edad < espera)
      return guardado.filas.length ? guardado : null;

    let promesa = this.enCurso.get(moneda);
    if (!promesa) {
      promesa = this.descargar(moneda)
        .catch((e: Error) => {
          this.log.warn(
            `${moneda}: no se pudo descargar la referencia (${e.message})`,
          );
          // Se conserva lo último bueno y se marca el error para reintentar más tarde.
          return {
            fuente: guardado?.fuente ?? FRANKFURTER,
            filas: guardado?.filas ?? [],
            descargado: Date.now(),
            error: e.message,
          };
        })
        .finally(() => this.enCurso.delete(moneda));
      this.enCurso.set(moneda, promesa);
    }
    const h = await promesa;
    this.cache.set(moneda, h);
    return h.filas.length ? h : null;
  }

  // ---------- comparación con los precios del negocio ----------

  /**
   * Por cada divisa con precio: valor de referencia del mercado, qué tan lejos
   * están tus precios, cuánto se movió el mercado desde que los actualizaste y
   * una sugerencia que conserva tu margen habitual frente al mercado.
   */
  async comparativo(forzar = false) {
    const vigentes = await this.tiposCambioService.actual();
    if (!this.activa) {
      return { activa: false, umbralPct: this.umbral, divisas: [] };
    }

    const divisas = await Promise.all(
      vigentes
        .filter((t) => t.moneda.codigo.toUpperCase() !== 'MXN')
        .map(async (t) => {
          const codigo = t.moneda.codigo.toUpperCase();
          const h = await this.historial(codigo, forzar);
          if (!h) return { codigo, disponible: false as const };

          const actual = h.filas[0];
          const compra = new Decimal(t.tipoCambioCompra);
          const venta = new Decimal(t.tipoCambioVenta);
          const fechaPrecio = isoDia(new Date(t.fechaVigencia));
          // Referencia que había cuando el dueño puso sus precios.
          const alPoner = h.filas.find((f) => f.fecha <= fechaPrecio);
          const seMovio = alPoner && alPoner.fecha !== actual.fecha;
          const movimiento = seMovio ? pct(actual.valor, alPoner.valor) : null;

          // Comprar arriba del mercado o vender abajo de él es perder dinero.
          const pierde = compra.gt(actual.valor) || venta.lt(actual.valor);
          const revisar =
            movimiento !== null && movimiento.abs().gte(this.umbral);

          return {
            codigo,
            disponible: true as const,
            fuente: h.fuente,
            referencia: actual.valor.toFixed(4),
            fechaReferencia: actual.fecha,
            tuPrecio: {
              compra: compra.toFixed(4),
              venta: venta.toFixed(4),
              actualizado: new Date(t.fechaVigencia).toISOString(),
            },
            // Negativo = abajo del mercado, positivo = arriba.
            compraVsMercadoPct: pct(compra, actual.valor).toFixed(2),
            ventaVsMercadoPct: pct(venta, actual.valor).toFixed(2),
            movimientoPct: movimiento?.toFixed(2) ?? null,
            referenciaAlActualizar: seMovio
              ? { valor: alPoner.valor.toFixed(4), fecha: alPoner.fecha }
              : null,
            // Precios sugeridos (nunca en pérdida); ver sugerirPrecios().
            sugerencia: sugerirPrecios(
              compra,
              venta,
              actual.valor,
              alPoner?.valor ?? null,
            ),
            estado: pierde ? 'perdida' : revisar ? 'revisar' : 'ok',
          };
        }),
    );

    return { activa: true, umbralPct: this.umbral, divisas };
  }
}
