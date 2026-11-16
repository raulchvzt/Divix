/**
 * Avisos de la campana, calculados con datos reales:
 *  - la caja del usuario (cerrada, o abierta desde otro día)
 *  - solo administrador: divisas con precio en pérdida o con el mercado movido
 */

const mismoDia = (a, b) => a.toDateString() === b.toDateString()

export function calcularAvisos({ corte, cargando, mercado, esAdmin, ahora = new Date() }) {
  const avisos = []

  if (!cargando && !corte) {
    avisos.push({
      id: 'caja-cerrada',
      nivel: 'aviso',
      titulo: 'Tu caja está cerrada',
      texto: 'Ábrela con tu conteo inicial para poder registrar operaciones.',
      ruta: '/caja',
    })
  } else if (corte?.fechaApertura && !mismoDia(new Date(corte.fechaApertura), ahora)) {
    const fecha = new Date(corte.fechaApertura).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
    avisos.push({
      id: 'caja-dias',
      nivel: 'aviso',
      titulo: 'Caja sin cortar',
      texto: `Tu caja sigue abierta desde el ${fecha}. Haz el corte del día.`,
      ruta: '/caja',
    })
  }

  if (esAdmin) {
    for (const [codigo, m] of Object.entries(mercado ?? {})) {
      if (m.estado === 'perdida') {
        avisos.push({
          id: `perdida-${codigo}`,
          nivel: 'grave',
          titulo: `${codigo}: precio en pérdida`,
          texto:
            m.compraVsMercadoPct > 0
              ? 'Estás comprando más caro que el mercado.'
              : 'Estás vendiendo más barato que el mercado.',
          ruta: '/tipos-de-cambio',
        })
      } else if (m.estado === 'revisar' && m.movimientoPct !== null) {
        avisos.push({
          id: `mercado-${codigo}`,
          nivel: 'aviso',
          titulo: `${codigo}: revisa tus precios`,
          texto: `El mercado ${m.movimientoPct >= 0 ? 'subió' : 'bajó'} ${Math.abs(m.movimientoPct).toFixed(2)}% desde que los actualizaste.`,
          ruta: '/tipos-de-cambio',
        })
      }
    }
  }

  return avisos
}
