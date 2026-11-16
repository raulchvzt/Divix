import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, AlertTriangle, Info, CheckCircle2, ChevronRight } from 'lucide-react'

/** Campana del encabezado con su lista de avisos (ver utils/avisos.js). */
export default function Notificaciones({ avisos }) {
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef(null)

  // Se cierra con clic afuera o con Esc.
  useEffect(() => {
    if (!abierto) return
    const alClic = (e) => !contenedor.current?.contains(e.target) && setAbierto(false)
    const alTecla = (e) => e.key === 'Escape' && setAbierto(false)
    document.addEventListener('mousedown', alClic)
    document.addEventListener('keydown', alTecla)
    return () => {
      document.removeEventListener('mousedown', alClic)
      document.removeEventListener('keydown', alTecla)
    }
  }, [abierto])

  const hayGraves = avisos.some((a) => a.nivel === 'grave')

  return (
    <div ref={contenedor} className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        title="Avisos"
        aria-label={avisos.length ? `Avisos (${avisos.length})` : 'Avisos'}
        aria-expanded={abierto}
        className="relative flex p-1 text-slate-600 hover:text-slate-900"
      >
        <Bell size={22} strokeWidth={1.8} />
        {avisos.length > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full ring-2 ring-white text-[10px] font-bold text-white flex items-center justify-center ${
              hayGraves ? 'bg-red-500' : 'bg-amber-500'
            }`}
          >
            {avisos.length}
          </span>
        )}
      </button>

      {abierto && (
        <div className="animar-modal fixed left-3 right-3 top-[76px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[340px] z-30 rounded-2xl border border-line bg-white shadow-xl overflow-hidden">
          <p className="px-4 py-3 border-b border-line text-sm font-bold">Avisos</p>
          {avisos.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              <CheckCircle2 size={28} className="mx-auto mb-2 text-brand-500" />
              Todo en orden. No tienes avisos.
            </div>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto divide-y divide-line">
              {avisos.map((a) => {
                const Icono = a.nivel === 'grave' ? AlertTriangle : Info
                return (
                  <li key={a.id}>
                    <Link
                      to={a.ruta}
                      onClick={() => setAbierto(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50"
                    >
                      <Icono
                        size={18}
                        className={`shrink-0 mt-0.5 ${a.nivel === 'grave' ? 'text-red-500' : 'text-amber-500'}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{a.titulo}</span>
                        <span className="block text-xs text-slate-500 leading-relaxed">{a.texto}</span>
                      </span>
                      <ChevronRight size={16} className="shrink-0 mt-0.5 text-slate-300" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
