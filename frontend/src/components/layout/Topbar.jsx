import { LogOut, Menu } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { obtenerUsuario, cerrarSesion } from '../../api/auth'
import Notificaciones from './Notificaciones'
import Avatar from '../Avatar'

const ROLES = { administrador: 'Administrador', cajero: 'Cajero' }

function saludo() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function fechaHoy() {
  const f = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return f.charAt(0).toUpperCase() + f.slice(1)
}

export default function Topbar({ onMenu = () => {}, corte = null, avisos = [], perfil = null }) {
  const navigate = useNavigate()
  const sesion = obtenerUsuario() ?? { nombre: 'Usuario', rol: '' }
  // El perfil trae los datos más recientes (si se editaron); la sesión es el respaldo.
  const usuario = { ...sesion, nombre: perfil?.nombre ?? sesion.nombre }
  const nombreCompleto = perfil ? `${perfil.nombre} ${perfil.apellidoPaterno ?? ''}`.trim() : usuario.nombre

  const salir = () => {
    cerrarSesion()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-20 min-h-[73px] bg-white border-b border-line flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
      <button onClick={onMenu} title="Menú" className="lg:hidden -ml-1 p-2 text-slate-600 hover:text-slate-900">
        <Menu size={24} />
      </button>

      <div className="min-w-0 mr-auto">
        <p className="hidden sm:block text-xs text-slate-400 font-medium">{fechaHoy()}</p>
        <p className="text-base sm:text-lg font-bold leading-tight truncate">{saludo()}, {usuario.nombre.split(' ')[0]}</p>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        {/* Estado de caja */}
        <div
          title={corte ? 'Caja abierta' : 'Sin corte abierto'}
          className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-full ${
            corte ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${corte ? 'bg-brand-500' : 'bg-slate-400'}`} />
          <span className="hidden sm:inline">{corte ? 'Caja abierta' : 'Sin corte abierto'}</span>
        </div>

        {/* Notificaciones */}
        <Notificaciones avisos={avisos} />

        {/* Usuario */}
        <div className="flex items-center gap-3">
          <Link
            to="/perfil"
            title="Mi perfil"
            className="flex items-center gap-3 rounded-full md:rounded-xl md:pr-2 hover:bg-slate-50 transition-colors"
          >
            <Avatar nombre={nombreCompleto} foto={perfil?.foto} />
            <div className="hidden md:block text-left leading-tight">
              <p className="text-sm font-semibold">{nombreCompleto}</p>
              <p className="text-[11px] text-slate-400">{ROLES[usuario.rol] ?? usuario.rol}</p>
            </div>
          </Link>
          <button onClick={salir} title="Cerrar sesión" className="text-slate-400 hover:text-slate-700 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}