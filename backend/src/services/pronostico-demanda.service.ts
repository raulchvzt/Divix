import { Injectable } from '@nestjs/common';
import { OperacionesService } from './operaciones.service';

/**
 * PRONÓSTICO DE DEMANDA por divisa: cuántas unidades de cada divisa se espera
 * vender y comprar en los próximos meses, según el historial del propio negocio.
 *
 * No predice el tipo de cambio (eso no se puede con certeza); predice la
 * DEMANDA, que sí tiene patrones que se repiten cada año (vacaciones, fiestas,
 * remesas…), para que el negocio tenga suficiente efectivo de cada divisa.
 *
 * Método (descomposición estacional clásica, multiplicativa):
 *  1. Se suma la cantidad de divisa por mes (solo meses completos).
 *  2. Temporada: cada mes se compara con el promedio móvil de 12 meses centrado
 *     en él; el promedio de esas proporciones por mes del año es su índice
 *     (1.35 = ese mes se mueve 35% más que un mes normal).
 *  3. Tendencia: recta de mínimos cuadrados sobre los últimos 24 meses ya sin
 *     temporada (¿el negocio va creciendo o bajando?).
 *  4. Pronóstico = tendencia proyectada × índice del mes.
 *  5. Prueba: se pronostica cada uno de los últimos 6 meses usando solo los
 *     datos anteriores a él y se compara con lo que realmente pasó. El
 *     promedio de esos errores es el "error promedio" que se muestra.
 */

const MESES_PRONOSTICO = 3;
const MESES_PRUEBA = 6;
const VENTANA_TENDENCIA = 24;
const MIN_MESES = 3; // menos que esto no se pronostica
const MIN_MESES_TEMPORADA = 13; // para estimar temporadas hace falta más de un año

type Tipo = 'venta' | 'compra';
const TIPOS: Tipo[] = ['venta', 'compra'];

/** "AAAA-MM" en hora local. */
const claveMes = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const sumarMeses = (clave: string, n: number) => {
  const [a, m] = clave.split('-').map(Number);
  return claveMes(new Date(a, m - 1 + n, 1));
};
const mesDelAnio = (clave: string) => Number(clave.slice(5, 7)) - 1;
const redondear = (n: number) => Math.round(n * 100) / 100;

/** Índice de temporada por mes del año (12 valores, promedio 1). */
function indicesTemporada(serie: number[], meses: string[]): number[] {
  if (serie.length < MIN_MESES_TEMPORADA)
    return Array.from({ length: 12 }, () => 1);
  const proporciones: number[][] = Array.from({ length: 12 }, () => []);
  // Promedio móvil centrado de 12 meses (2×12): cubre un año completo.
  for (let t = 6; t < serie.length - 6; t++) {
    let suma = serie[t - 6] / 2 + serie[t + 6] / 2;
    for (let k = t - 5; k <= t + 5; k++) suma += serie[k];
    const centrado = suma / 12;
    if (centrado > 0)
      proporciones[mesDelAnio(meses[t])].push(serie[t] / centrado);
  }
  // Si con pocos datos faltan proporciones en los extremos, se usa la del año completo.
  const promedioAnual = serie.reduce((a, b) => a + b, 0) / serie.length;
  for (let t = 0; t < serie.length; t++) {
    const m = mesDelAnio(meses[t]);
    if (proporciones[m].length === 0 && promedioAnual > 0)
      proporciones[m].push(serie[t] / promedioAnual);
  }
  const indices = proporciones.map((p) =>
    p.length ? p.reduce((a, b) => a + b, 0) / p.length : 1,
  );
  const media = indices.reduce((a, b) => a + b, 0) / 12;
  return indices.map((i) => (media > 0 ? i / media : 1));
}

/** Ajusta el modelo con la serie y devuelve una función que pronostica h meses adelante. */
function ajustar(serie: number[], meses: string[]) {
  const indices = indicesTemporada(serie, meses);
  const sinTemporada = serie.map(
    (v, t) => v / (indices[mesDelAnio(meses[t])] || 1),
  );

  // Recta de mínimos cuadrados sobre la ventana reciente.
  const desde = Math.max(0, sinTemporada.length - VENTANA_TENDENCIA);
  const ys = sinTemporada.slice(desde);
  const n = ys.length;
  const xMedia = (n - 1) / 2;
  const yMedia = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  ys.forEach((y, i) => {
    num += (i - xMedia) * (y - yMedia);
    den += (i - xMedia) ** 2;
  });
  // Con menos de 6 meses la pendiente es poco confiable: se usa el promedio.
  const pendiente = n >= 6 && den > 0 ? num / den : 0;

  const ultimo = meses[meses.length - 1];
  return (h: number) => {
    const mes = sumarMeses(ultimo, h);
    const normal = Math.max(0, yMedia + pendiente * (n - 1 + h - xMedia));
    const indice = indices[mesDelAnio(mes)];
    return { mes, normal, indice, valor: normal * indice };
  };
}

/** Error promedio (%) al pronosticar los últimos meses solo con datos anteriores. */
function probar(serie: number[], meses: string[]) {
  const errores: number[] = [];
  for (let k = serie.length - MESES_PRUEBA; k < serie.length; k++) {
    if (k < MIN_MESES_TEMPORADA || serie[k] <= 0) continue;
    const pronostico = ajustar(serie.slice(0, k), meses.slice(0, k))(1).valor;
    errores.push(Math.abs(pronostico - serie[k]) / serie[k]);
  }
  if (!errores.length) return null;
  return {
    errorPct: redondear(
      (errores.reduce((a, b) => a + b, 0) / errores.length) * 100,
    ),
    mesesProbados: errores.length,
  };
}

@Injectable()
export class PronosticoDemandaService {
  constructor(private readonly operacionesService: OperacionesService) {}

  async pronosticar() {
    const hoy = new Date();
    const mesActual = claveMes(hoy);
    // Se toman hasta 3 años de historial.
    const inicio = new Date(hoy.getFullYear() - 3, hoy.getMonth(), 1);
    const operaciones = await this.operacionesService.listar({
      fechaInicio: inicio,
      fechaFin: hoy,
    });

    // divisa -> mes -> { venta, compra } en unidades de divisa
    const porDivisa = new Map<
      string,
      {
        nombre: string;
        volumenMxn: number;
        inicio: Date;
        meses: Map<string, Record<Tipo, number>>;
      }
    >();
    for (const op of operaciones) {
      const codigo = op.moneda?.codigo;
      if (!codigo) continue;
      const fecha = new Date(op.fechaHora);
      const mes = claveMes(fecha);
      const d = porDivisa.get(codigo) ?? {
        nombre: op.moneda.nombre,
        volumenMxn: 0,
        inicio: fecha,
        meses: new Map(),
      };
      if (fecha < d.inicio) d.inicio = fecha;
      const fila = d.meses.get(mes) ?? { venta: 0, compra: 0 };
      fila[op.tipoOperacion as Tipo] += Number(op.cantidadDivisa);
      d.volumenMxn += Number(op.importeTotal);
      d.meses.set(mes, fila);
      porDivisa.set(codigo, d);
    }

    const divisas = [...porDivisa.entries()]
      .sort(([, a], [, b]) => b.volumenMxn - a.volumenMxn)
      .map(([codigo, d]) => {
        // Meses completos, del primero con operaciones al anterior al actual (los
        // vacíos cuentan como 0). Si el historial empezó a mitad de un mes, ese
        // mes no cuenta: está incompleto y haría ver la demanda más baja.
        let primero = [...d.meses.keys()].sort()[0];
        if (d.inicio.getDate() > 3) primero = sumarMeses(primero, 1);
        const meses: string[] = [];
        for (let m = primero; m < mesActual; m = sumarMeses(m, 1))
          meses.push(m);
        const serie = (tipo: Tipo) =>
          meses.map((m) => d.meses.get(m)?.[tipo] ?? 0);
        const enCurso = d.meses.get(mesActual) ?? { venta: 0, compra: 0 };

        const historial = meses.slice(-24).map((mes) => ({
          mes,
          venta: redondear(d.meses.get(mes)?.venta ?? 0),
          compra: redondear(d.meses.get(mes)?.compra ?? 0),
        }));

        if (meses.length < MIN_MESES) {
          return {
            codigo,
            nombre: d.nombre,
            suficiente: false as const,
            mesesHistorial: meses.length,
            historial,
            nota: `Hace falta al menos ${MIN_MESES} meses completos de operaciones para pronosticar.`,
          };
        }

        const modelos = Object.fromEntries(
          TIPOS.map((t) => [t, ajustar(serie(t), meses)]),
        ) as Record<Tipo, ReturnType<typeof ajustar>>;
        const pronostico = Array.from({ length: MESES_PRONOSTICO }, (_, i) => {
          const h = i + 1;
          const mes = sumarMeses(meses[meses.length - 1], h);
          return {
            mes,
            enCurso: mes === mesActual,
            ...(mes === mesActual
              ? {
                  llevamos: {
                    venta: redondear(enCurso.venta),
                    compra: redondear(enCurso.compra),
                  },
                }
              : {}),
            ...Object.fromEntries(
              TIPOS.map((t) => {
                const p = modelos[t](h);
                return [
                  t,
                  {
                    valor: redondear(p.valor),
                    normal: redondear(p.normal), // un mes "normal" sin efecto de temporada
                    vsNormalPct: redondear((p.indice - 1) * 100),
                  },
                ];
              }),
            ),
          };
        });

        const prueba = Object.fromEntries(
          TIPOS.map((t) => [t, probar(serie(t), meses)]),
        );

        return {
          codigo,
          nombre: d.nombre,
          suficiente: true as const,
          conTemporada: meses.length >= MIN_MESES_TEMPORADA,
          mesesHistorial: meses.length,
          historial,
          pronostico,
          prueba,
        };
      });

    return { mesActual, generado: hoy.toISOString(), divisas };
  }
}
