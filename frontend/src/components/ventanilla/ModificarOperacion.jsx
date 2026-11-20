import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { modificarOperacion } from '../../api/operaciones'
import { dinero } from '../../utils/formato'
import InputNumero from '../InputNumero'
import SelectorBilletes from '../SelectorBilletes'
import { billetesVacios, billetesValidos } from '../../utils/billetes'

const campo =
  'w-full bg-white border border-line rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'

/**
 * Corrige el tipo de cambio y la cantidad de una operación del turno abierto (solo administrador).
 * `operacion`: fila normalizada de la tabla de transacciones.
 * `caja`: caja abierta (GET /cortes-caja/activo), para los billetes de USD disponibles.
 */
export default function ModificarOperacion({ operacion: t, caja, onCerrar, onGuardada }) {
  const [tasa, setTasa] = useState(String(t.tasa))
  const [monto, setMonto] = useState(String(t.monto))
  const [billetes, setBilletes] = useState(billetesVacios)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const esUsd = t.divisa === 'USD'
  const modo = t.tipo === 'venta' ? 'entregar' : 'recibir'
  const cambioMonto = Number(monto) !== t.monto
  const total = Math.round((Number(monto) || 0) * (Number(tasa) || 0) * 100) / 100

  // En una venta, los billetes de esta operación regresan a la caja antes de volver a entregarse.
  const disponibles = (() => {
    const esperados = caja?.billetes?.completo ? caja.billetes.esperados : null
    if (!esperados || t.tipo !== 'venta') return esperados
    const suma = { ...esperados }
    for (const [d, n] of Object.entries(t.billetes ?? {})) suma[d] = (suma[d] ?? 0) + n
    return suma
  })()

  const guardar = async () => {
    setError('')
    if (!(Number(tasa) > 0)) return setError('Escribe un tipo de cambio válido.')
    if (!(Number(monto) > 0)) return setError('Escribe un monto mayor a cero.')
    if (esUsd && cambioMonto && !billetesValidos(monto, modo, disponibles, billetes)) {
      return setError('Revisa los billetes: deben sumar el monto y no puedes entregar más de los que hay en caja.')
    }
    setGuardando(true)
    try {
      await modificarOperacion(t.id, {
        tasa,
        monto,
        // Si el monto no cambió se conservan los billetes originales.
        billetes: esUsd ? (cambioMonto ? billetes : t.billetes) : undefined,
      })
      onGuardada()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">Modificar operación #{t.id}</h2>
            <p className="text-sm text-slate-500">
              {t.tipo === 'venta' ? 'Venta' : 'Compra'} de {t.divisa} · {t.hora}
            </p>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X size={22} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm font-semibold">
            Tipo de cambio
            <InputNumero decimales={4} value={tasa} onChange={(e) => setTasa(e.target.value)} className={`${campo} mt-2 text-right`} />
          </label>
          <label className="text-sm font-semibold">
            Monto en {t.divisa}
            <InputNumero
              decimales={esUsd ? 0 : 2}
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className={`${campo} mt-2 text-right`}
            />
          </label>
        </div>

        {esUsd && cambioMonto && Number(monto) > 0 && (
          <div className="mt-4">
            <SelectorBilletes monto={monto} modo={modo} disponibles={disponibles} value={billetes} onChange={setBilletes} />
          </div>
        )}

        <div className="mt-5 rounded-xl bg-brand-50 px-4 py-3">
          <p className="text-xs font-semibold text-brand-700">Nuevo importe en moneda nacional</p>
          <p className="text-2xl font-bold text-brand-700">
            {dinero(total)} <span className="text-sm font-semibold text-slate-500">MXN</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">Antes: {dinero(t.total)} MXN</p>
        </div>

        {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCerrar} className="rounded-xl border border-line px-5 py-3 text-sm font-semibold">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 px-5 py-3 text-sm font-semibold text-white"
          >
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
