import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calculator, Plus, Lock, ArrowRight } from 'lucide-react'
import { obtenerDivisas, guardarTipoCambio } from '../../api/divisas'
import { registrarOperacion, obtenerClienteGeneral } from '../../api/operaciones'
import { useCarga } from '../../api/useCarga'
import { dinero } from '../../utils/formato'
import InputNumero from '../InputNumero'
import Bandera from '../Bandera'
import Ticket from './Ticket'
import { obtenerUsuario } from '../../api/auth'
import SelectorBilletes from '../SelectorBilletes'
import { billetesVacios, billetesValidos } from '../../utils/billetes'

const campo =
  'w-full bg-white border border-line rounded-xl px-4 py-3.5 text-sm font-medium outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition'

/**
 * caja: caja abierta del usuario (GET /cortes-caja/activo) o null si no tiene.
 * billetesCaja: inventario de billetes de USD de la caja abierta ({ esperados, completo }) o null.
 */
export default function OperacionRapida({ onRegistrada, caja, cajaCargando, billetesCaja }) {
  const [tipo, setTipo] = useState('venta') // 'compra' | 'venta'
  const [codigo, setCodigo] = useState('')
  const [monto, setMonto] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [ticket, setTicket] = useState(null)
  const [billetes, setBilletes] = useState(billetesVacios)
  const [version, setVersion] = useState(0)
  const [tasaNueva, setTasaNueva] = useState(null) // texto del tipo de cambio editado; null si no se ha tocado
  const [guardandoTasa, setGuardandoTasa] = useState(false)
  const { datos: divisas, error: errorDivisas } = useCarga(obtenerDivisas, [version])

  const divisa = divisas?.find((d) => d.codigo === codigo) ?? divisas?.[0]
  const tasa = divisa ? (tipo === 'venta' ? divisa.venta : divisa.compra) : 0
  const total = Math.round((parseFloat(monto) || 0) * tasa * 100) / 100

  // Cambio rápido del tipo de cambio desde Ventanilla (solo administrador).
  // Se guarda igual que en la sección Tipos de cambio, así que se refleja en ambas.
  const puedeEditarTasa = obtenerUsuario()?.rol === 'administrador'
  const tasaCambiada = tasaNueva !== null && parseFloat(tasaNueva) !== tasa

  const guardarTasa = async () => {
    setError('')
    setAviso('')
    const nueva = parseFloat(tasaNueva)
    if (!(nueva > 0)) return setError('Escribe un tipo de cambio válido.')
    const compra = tipo === 'compra' ? nueva : divisa.compra
    const venta = tipo === 'venta' ? nueva : divisa.venta
    if (venta < compra) return setError('El precio de venta no puede ser menor al de compra.')
    setGuardandoTasa(true)
    try {
      await guardarTipoCambio(divisa.id, compra, venta)
      setTasaNueva(null)
      setVersion((v) => v + 1)
      setAviso(`Tipo de cambio de ${tipo} de ${divisa.codigo} actualizado.`)
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardandoTasa(false)
    }
  }

  // Dólares: se indica qué billetes se entregan (venta) o se reciben (compra).
  const esUsd = divisa?.codigo === 'USD'
  const modoBilletes = tipo === 'venta' ? 'entregar' : 'recibir'
  const disponibles = billetesCaja?.completo ? billetesCaja.esperados : null

  // Solo se opera con la caja abierta, y la caja no puede quedar en negativo:
  // para vender hace falta la divisa; para comprar, los pesos con que se paga.
  const sinCaja = !cajaCargando && !caja
  const saldoDivisa = Number(caja?.esperados?.[divisa?.codigo] ?? 0)
  const saldoPesos = Number(caja?.esperados?.MXN ?? 0)
  const formato = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const faltaSaldo =
    caja && parseFloat(monto) > 0
      ? tipo === 'venta'
        ? parseFloat(monto) > saldoDivisa
          ? `No hay suficiente ${divisa?.codigo} en tu caja: tienes ${formato(saldoDivisa)}.`
          : ''
        : total > saldoPesos
          ? `No hay suficientes pesos en tu caja para pagar ${dinero(total)} (tienes ${dinero(saldoPesos)}). Pide una reposición en Caja.`
          : ''
      : ''

  const registrar = async () => {
    setError('')
    setAviso('')
    if (!divisa) return setError('No hay divisas disponibles.')
    if (sinCaja) return setError('Abre tu caja antes de registrar operaciones.')
    if (!(parseFloat(monto) > 0)) return setError('Escribe un monto mayor a cero.')
    if (faltaSaldo) return setError(faltaSaldo)
    if (esUsd && !billetesValidos(monto, modoBilletes, disponibles, billetes)) {
      return setError('Revisa los billetes: deben sumar el monto y no puedes entregar más de los que hay en caja.')
    }
    setEnviando(true)
    try {
      const cliente = await obtenerClienteGeneral()
      const op = await registrarOperacion({
        idCliente: cliente.id,
        idMoneda: divisa.id,
        tipo,
        monto,
        billetes: esUsd ? billetes : undefined,
      })
      setAviso(`Operación registrada: ${tipo} de ${monto} ${divisa.codigo}`)
      // Los importes salen de la respuesta del servidor, que es quien calcula el tipo de cambio.
      setTicket({
        folio: op.id,
        fecha: op.fechaHora ? new Date(op.fechaHora) : new Date(),
        tipo: op.tipoOperacion ?? tipo,
        codigo: divisa.codigo,
        nombreDivisa: divisa.nombre,
        cantidad: Number(op.cantidadDivisa ?? monto),
        tasa: Number(op.tipoCambioAplicado ?? tasa),
        total: Number(op.importeTotal ?? total),
        cajero: obtenerUsuario()?.nombre ?? '—',
        cliente: `${cliente.nombre} ${cliente.apellidoPaterno ?? ''}`.trim(),
        billetes: op.billetes ?? null,
      })
      setMonto('')
      onRegistrada?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-4 sm:p-6 shadow-sm">
      {/* Encabezado */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-base font-bold">Operación rápida</h2>
          <p className="text-sm text-slate-500 mt-0.5">Registra una nueva transacción</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
          <Calculator size={20} strokeWidth={1.8} />
        </div>
      </div>

      {/* Pestañas Comprar / Vender */}
      <div className="grid grid-cols-2 gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {[
          { id: 'compra', label: 'Comprar divisa' },
          { id: 'venta', label: 'Vender divisa' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTipo(t.id)
              setTasaNueva(null)
            }}
            className={`py-3 rounded-lg text-sm font-semibold transition-colors ${
              tipo === t.id ? 'bg-brand-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sin caja abierta no se puede operar */}
      {sinCaja && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Lock size={18} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-900">
            <span className="font-semibold">Tu caja está cerrada.</span> Ábrela para empezar a registrar operaciones.
          </p>
          <Link
            to="/caja"
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Abrir caja
            <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* Campos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
        <div>
          <label className="block text-sm font-semibold mb-2">Divisa</label>
          <div className="relative">
            {divisa && <Bandera codigo={divisa.codigo} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />}
            <select value={divisa?.codigo ?? ''} onChange={(e) => {
              setCodigo(e.target.value)
              setTasaNueva(null)
            }} className={`${campo} pl-11!`}>
            {(divisas ?? []).map((d) => (
              <option key={d.codigo} value={d.codigo}>
                {d.codigo} · {d.nombre}
              </option>
            ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Monto en divisa</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm font-medium text-slate-400">
              {divisa && <Bandera codigo={divisa.codigo} />}
              {divisa?.codigo}
            </span>
            <InputNumero
              decimales={esUsd ? 0 : 2}
              placeholder={esUsd ? '0' : '0.00'}
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className={`${campo} text-right text-base font-semibold`}
            />
          </div>
          {caja && divisa && (
            <p className={`text-xs mt-2 ${faltaSaldo ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
              {faltaSaldo ||
                (tipo === 'venta'
                  ? `En tu caja: ${formato(saldoDivisa)} ${divisa.codigo}`
                  : `Pesos en tu caja: ${dinero(saldoPesos)}`)}
            </p>
          )}
        </div>


          <div className="sm:col-span-2">
          <label className="block text-sm font-semibold mb-2">Tipo de cambio</label>
          {puedeEditarTasa && divisa ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-1 items-center justify-between gap-3 bg-slate-50 border border-line rounded-xl px-4 py-2 text-sm">
                <span className="text-slate-500 shrink-0">1 {divisa.codigo} =</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">$</span>
                  <InputNumero
                    decimales={4}
                    value={tasaNueva ?? String(tasa)}
                    onChange={(e) => setTasaNueva(e.target.value)}
                    className="w-28 bg-white border border-line rounded-lg px-3 py-1.5 text-right font-semibold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                  <span className="font-semibold">MXN</span>
                </div>
              </div>
              {tasaCambiada && (
                <button
                  type="button"
                  onClick={guardarTasa}
                  disabled={guardandoTasa}
                  className="rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-3"
                >
                  {guardandoTasa ? 'Guardando…' : 'Guardar'}
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between bg-slate-50 border border-line rounded-xl px-4 py-3.5 text-sm">
              <span className="text-slate-500">1 {divisa?.codigo} =</span>
              <span className="font-semibold">{dinero(tasa)} MXN</span>
            </div>
          )}
        </div>

        {esUsd && parseFloat(monto) > 0 && (
          <div className="sm:col-span-2">
            <SelectorBilletes
              monto={monto}
              modo={modoBilletes}
              disponibles={disponibles}
              value={billetes}
              onChange={setBilletes}
            />
          </div>
        )}
      </div>

      {(error || errorDivisas) && <p className="text-sm font-medium text-red-600 mt-4">{error || errorDivisas}</p>}
      {aviso && <p className="text-sm font-medium text-brand-700 mt-4">{aviso}</p>}

      {/* Total y botón */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 bg-brand-50 rounded-xl px-4 sm:px-5 py-4">
        <div>
          <p className="text-xs font-semibold text-brand-700 mb-1">Importe en moneda nacional</p>
          <p className="text-2xl sm:text-[28px] font-bold tracking-tight text-brand-700 leading-none [overflow-wrap:anywhere]">
            {dinero(total)} <span className="text-sm font-semibold text-slate-500">MXN</span>
          </p>
        </div>
        <button
          onClick={registrar}
          disabled={enviando || sinCaja || !!faltaSaldo}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-600 text-white text-sm font-semibold px-6 py-3.5 rounded-xl shadow-lg shadow-brand-600/30 transition-colors"
        >
          <Plus size={20} />
          {enviando ? 'Registrando…' : 'Registrar operación'}
        </button>
      </div>
      {ticket && <Ticket operacion={ticket} onCerrar={() => setTicket(null)} />}
    </div>
  )
}