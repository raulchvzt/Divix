import { obtenerNegocio } from '../api/configuracion'
import { obtenerUsuario } from '../api/auth'
import { dinero } from './formato'

/**
 * Abre el resultado de un corte cerrado en una ventana nueva lista para imprimir.
 * En el diálogo de impresión se elige "Guardar como PDF" para obtener el archivo.
 *
 * `corte`: el último corte cerrado (GET /cortes-caja/ultimo-cierre), con su ganancia.
 */

const denominaciones = [100, 50, 20, 10, 5, 2, 1]
const num = (v) => Number(v ?? 0)
const fechaHora = (f) =>
  f ? new Date(f).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short', hour12: false }) : '—'
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const fila = (celdas, clase = '') => `<tr class="${clase}">${celdas.map((c) => `<td>${c}</td>`).join('')}</tr>`

function html(corte, negocio, cajero) {
  const divisas = Object.keys({ ...(corte.saldosIniciales ?? {}), ...(corte.saldosFinales ?? {}) }).sort()
  const dif = corte.diferencias ?? {}

  const saldos = [
    fila(['Cajero · MXN', dinero(num(corte.efectivoInicial)), dinero(num(corte.efectivoFinal)), dinero(num(dif.MXN))]),
    fila(['Caja fuerte · MXN', dinero(num(corte.reservaInicial)), dinero(num(corte.reservaFinal)), dinero(num(dif.reserva))]),
    ...divisas.map((c) =>
      fila([c, dinero(num(corte.saldosIniciales?.[c])), dinero(num(corte.saldosFinales?.[c])), dinero(num(dif[c]))]),
    ),
  ].join('')

  const billetes = corte.billetesFinales
    ? denominaciones
        .map((d) => {
          const n = num(corte.billetesFinales[d])
          const dB = corte.diferenciasBilletes?.[d]
          return fila([`$${d}`, n.toLocaleString('en-US'), dinero(n * d), dB ? `${dB < 0 ? 'falta' : 'sobra'} ${Math.abs(dB)}` : '—'])
        })
        .join('')
    : ''

  const ganancia = corte.ganancia
  const porDivisa = Object.entries(ganancia?.porDivisa ?? {})
    .map(([c, m]) => `${c}: ${dinero(num(m))}`)
    .join(' · ')

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Corte de caja ${esc(fechaHora(corte.fechaCierre))}</title>
<style>
  @page { margin: 14mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 12px; margin: 0; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  h2 { font-size: 14px; margin: 18px 0 6px; }
  .sub { color: #555; margin: 0 0 12px; }
  .datos { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border-bottom: 1px solid #ddd; padding: 5px 6px; text-align: right; }
  th:first-child, td:first-child { text-align: left; }
  th { background: #f3f4f6; font-weight: bold; }
  .ganancia { border: 1px solid #b7dfc7; background: #eefaf2; border-radius: 6px; padding: 10px 12px; }
  .ganancia .monto { font-size: 22px; font-weight: bold; color: #14663a; }
  .firma { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; }
  .firma div { border-top: 1px solid #111; padding-top: 4px; }
</style></head><body>
  <h1>Corte de caja</h1>
  <p class="sub">${esc(negocio?.nombre ?? 'Casa de cambio')}${negocio?.rfc ? ` · RFC ${esc(negocio.rfc)}` : ''}</p>
  <div class="datos">
    <div><b>Cajero:</b> ${esc(cajero)}</div>
    <div><b>Folio de corte:</b> ${esc(corte.id)}</div>
    <div><b>Apertura:</b> ${esc(fechaHora(corte.fechaApertura))}</div>
    <div><b>Cierre:</b> ${esc(fechaHora(corte.fechaCierre))}</div>
    <div><b>Total de compras:</b> ${dinero(num(corte.totalCompras))} MXN</div>
    <div><b>Total de ventas:</b> ${dinero(num(corte.totalVentas))} MXN</div>
  </div>

  ${ganancia ? `<h2>Ganancia del turno (costo promedio)</h2>
  <div class="ganancia"><div class="monto">${dinero(num(ganancia.total))} MXN</div>${porDivisa ? `<div>${esc(porDivisa)}</div>` : ''}</div>` : ''}

  <h2>Saldos</h2>
  <table><thead><tr><th>Moneda</th><th>Inicial</th><th>Contado al cierre</th><th>Diferencia</th></tr></thead><tbody>${saldos}</tbody></table>
  <p class="sub">Diferencia positiva: sobrante; negativa: faltante.</p>

  ${billetes ? `<h2>Billetes de USD contados</h2>
  <table><thead><tr><th>Billete</th><th>Cantidad</th><th>Importe</th><th>Diferencia</th></tr></thead><tbody>${billetes}</tbody></table>` : ''}

  <div class="firma"><div>Entrega (cajero)</div><div>Recibe</div></div>
</body></html>`
}

export async function imprimirCorte(corte) {
  // La ventana se abre en el clic para que el navegador no la bloquee.
  const ventana = window.open('', '_blank')
  if (!ventana) return
  ventana.document.write('<p style="font-family:Arial;padding:20px">Preparando el corte…</p>')
  const negocio = await obtenerNegocio().catch(() => null)
  const cajero = obtenerUsuario()?.nombre ?? '—'
  ventana.document.open()
  ventana.document.write(html(corte, negocio, cajero))
  ventana.document.close()
  ventana.focus()
  setTimeout(() => ventana.print(), 300)
}
