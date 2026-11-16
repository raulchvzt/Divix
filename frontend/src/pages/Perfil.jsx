import { useRef, useState } from 'react'
import { Camera, Check, KeyRound, Lock, Trash2, UserRound } from 'lucide-react'
import Avatar from '../components/Avatar'
import { obtenerPerfil, actualizarPerfil, cambiarContrasena } from '../api/perfil'
import { useCarga } from '../api/useCarga'
import { prepararFoto } from '../utils/foto'

const ROLES = { administrador: 'Administrador', cajero: 'Cajero' }

const campo =
  'w-full bg-white border border-line rounded-xl px-4 py-3.5 text-sm font-medium outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition disabled:bg-slate-50 disabled:text-slate-500'

const botonPrincipal =
  'bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold px-6 py-3.5 rounded-xl shadow-lg shadow-brand-600/30 transition-colors'

function Campo({ label, children, ayuda }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">{label}</label>
      {children}
      {ayuda && <p className="mt-1.5 text-xs text-slate-400">{ayuda}</p>}
    </div>
  )
}

function Resultado({ error, listo, textoListo }) {
  if (error) return <span className="text-sm font-medium text-red-600">{error}</span>
  if (listo)
    return (
      <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-700">
        <Check size={18} />
        {textoListo}
      </span>
    )
  return null
}

export default function Perfil() {
  const { datos, error, cargando } = useCarga(obtenerPerfil)

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm text-slate-500">
          Cuenta / <span className="text-brand-600 font-medium">Mi perfil</span>
        </p>
        <h1 className="text-2xl sm:text-[32px] font-bold tracking-tight mt-2">Mi perfil</h1>
        <p className="text-sm text-slate-500 mt-1">Tu foto, tus datos y tu contraseña.</p>
      </div>

      {cargando && <p className="text-sm text-slate-400">Cargando tu perfil…</p>}
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      {datos && <Contenido inicial={datos} />}
    </div>
  )
}

function Contenido({ inicial }) {
  const [perfil, setPerfil] = useState(inicial)
  const esAdmin = perfil.rol?.nombreRol === 'administrador'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 max-w-5xl">
      <TarjetaFoto perfil={perfil} onCambio={setPerfil} />
      <div className="flex flex-col gap-6">
        <DatosPersonales perfil={perfil} esAdmin={esAdmin} onCambio={setPerfil} />
        <CambiarContrasena />
      </div>
    </div>
  )
}

function TarjetaFoto({ perfil, onCambio }) {
  const entrada = useRef(null)
  const [estado, setEstado] = useState({ error: '', guardando: false })
  const nombreCompleto = [perfil.nombre, perfil.apellidoPaterno, perfil.apellidoMaterno].filter(Boolean).join(' ')
  const desde = new Date(perfil.fechaRegistro).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const guardarFoto = async (foto) => {
    setEstado({ error: '', guardando: true })
    try {
      onCambio(await actualizarPerfil({ foto }))
      setEstado({ error: '', guardando: false })
    } catch (e) {
      setEstado({ error: e.message, guardando: false })
    }
  }

  const alElegir = async (e) => {
    const archivo = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir la misma imagen
    if (!archivo) return
    try {
      await guardarFoto(await prepararFoto(archivo))
    } catch (err) {
      setEstado({ error: err.message, guardando: false })
    }
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-6 shadow-sm h-fit">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <Avatar nombre={nombreCompleto} foto={perfil.foto} tamano={112} className={estado.guardando ? 'opacity-50' : ''} />
          <button
            onClick={() => entrada.current?.click()}
            disabled={estado.guardando}
            title="Cambiar foto"
            aria-label="Cambiar foto"
            className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-brand-600 text-white ring-4 ring-white flex items-center justify-center hover:bg-brand-700"
          >
            <Camera size={16} />
          </button>
          <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" onChange={alElegir} className="hidden" />
        </div>

        <p className="mt-4 text-lg font-bold leading-tight">{nombreCompleto}</p>
        <p className="text-sm text-slate-500">@{perfil.usuario}</p>
        <span className="mt-2 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-1">
          {ROLES[perfil.rol?.nombreRol] ?? perfil.rol?.nombreRol}
        </span>

        {perfil.foto && (
          <button
            onClick={() => guardarFoto(null)}
            disabled={estado.guardando}
            className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600"
          >
            <Trash2 size={14} />
            Quitar foto
          </button>
        )}
        {estado.guardando && <p className="mt-3 text-xs text-slate-400">Guardando foto…</p>}
        {estado.error && <p className="mt-3 text-xs font-medium text-red-600">{estado.error}</p>}
      </div>

      <dl className="mt-6 pt-5 border-t border-line text-sm space-y-3">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Correo</dt>
          <dd className="font-medium text-right break-all">{perfil.correo || '—'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Registrado</dt>
          <dd className="font-medium text-right">{desde}</dd>
        </div>
      </dl>
    </div>
  )
}

function DatosPersonales({ perfil, esAdmin, onCambio }) {
  const [datos, setDatos] = useState({
    nombre: perfil.nombre ?? '',
    apellidoPaterno: perfil.apellidoPaterno ?? '',
    apellidoMaterno: perfil.apellidoMaterno ?? '',
    correo: perfil.correo ?? '',
  })
  const [estado, setEstado] = useState({ error: '', listo: false, guardando: false })

  const cambiar = (clave) => (e) => {
    setDatos({ ...datos, [clave]: e.target.value })
    setEstado({ error: '', listo: false, guardando: false })
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (!datos.nombre.trim() || !datos.apellidoPaterno.trim()) {
      setEstado({ error: 'El nombre y el apellido paterno son obligatorios.', listo: false, guardando: false })
      return
    }
    setEstado({ error: '', listo: false, guardando: true })
    try {
      onCambio(
        await actualizarPerfil({
          nombre: datos.nombre.trim(),
          apellidoPaterno: datos.apellidoPaterno.trim(),
          apellidoMaterno: datos.apellidoMaterno.trim(),
          correo: datos.correo.trim(),
        }),
      )
      setEstado({ error: '', listo: true, guardando: false })
    } catch (err) {
      setEstado({ error: err.message, listo: false, guardando: false })
    }
  }

  return (
    <form onSubmit={guardar} className="bg-white border border-line rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-6">
        <UserRound size={20} className="text-brand-600 mt-0.5" />
        <div>
          <h2 className="text-base font-bold">Datos personales</h2>
          <p className="text-sm text-slate-500 mt-0.5">Aparecen en los tickets y en los cortes de caja.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Campo label="Nombre(s)">
          <input value={datos.nombre} onChange={cambiar('nombre')} disabled={!esAdmin} className={campo} />
        </Campo>
        <Campo label="Apellido paterno">
          <input value={datos.apellidoPaterno} onChange={cambiar('apellidoPaterno')} disabled={!esAdmin} className={campo} />
        </Campo>
        <Campo label="Apellido materno">
          <input value={datos.apellidoMaterno} onChange={cambiar('apellidoMaterno')} disabled={!esAdmin} className={campo} />
        </Campo>
        <Campo label="Correo electrónico">
          <input type="email" value={datos.correo} onChange={cambiar('correo')} disabled={!esAdmin} className={campo} />
        </Campo>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-4 mt-6 pt-5 border-t border-line">
        {esAdmin ? (
          <>
            <Resultado {...estado} textoListo="Datos guardados" />
            <button type="submit" disabled={estado.guardando} className={botonPrincipal}>
              {estado.guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </>
        ) : (
          <p className="flex items-center gap-2 text-xs text-slate-500 mr-auto">
            <Lock size={14} />
            Si algún dato está mal, pídele al administrador que lo corrija.
          </p>
        )}
      </div>
    </form>
  )
}

function CambiarContrasena() {
  const vacio = { actual: '', nueva: '', confirmar: '' }
  const [datos, setDatos] = useState(vacio)
  const [mostrar, setMostrar] = useState(false)
  const [estado, setEstado] = useState({ error: '', listo: false, guardando: false })

  const cambiar = (clave) => (e) => {
    setDatos({ ...datos, [clave]: e.target.value })
    setEstado({ error: '', listo: false, guardando: false })
  }

  const guardar = async (e) => {
    e.preventDefault()
    const error =
      !datos.actual || !datos.nueva
        ? 'Escribe tu contraseña actual y la nueva.'
        : datos.nueva.length < 8
          ? 'La nueva contraseña debe tener al menos 8 caracteres.'
          : datos.nueva !== datos.confirmar
            ? 'La confirmación no coincide con la nueva contraseña.'
            : datos.nueva === datos.actual
              ? 'La nueva contraseña debe ser distinta de la actual.'
              : ''
    if (error) {
      setEstado({ error, listo: false, guardando: false })
      return
    }
    setEstado({ error: '', listo: false, guardando: true })
    try {
      await cambiarContrasena(datos.actual, datos.nueva)
      setDatos(vacio)
      setEstado({ error: '', listo: true, guardando: false })
    } catch (err) {
      setEstado({ error: err.message, listo: false, guardando: false })
    }
  }

  const tipo = mostrar ? 'text' : 'password'

  return (
    <form onSubmit={guardar} className="bg-white border border-line rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-6">
        <KeyRound size={20} className="text-brand-600 mt-0.5" />
        <div className="flex-1">
          <h2 className="text-base font-bold">Contraseña</h2>
          <p className="text-sm text-slate-500 mt-0.5">Si te dieron una contraseña temporal, cámbiala aquí.</p>
        </div>
        <button type="button" onClick={() => setMostrar((v) => !v)} className="text-xs font-semibold text-brand-700 hover:underline">
          {mostrar ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2 sm:max-w-[calc(50%-10px)]">
          <Campo label="Contraseña actual">
            <input type={tipo} value={datos.actual} onChange={cambiar('actual')} autoComplete="current-password" className={campo} />
          </Campo>
        </div>
        <Campo label="Nueva contraseña" ayuda="Mínimo 8 caracteres.">
          <input type={tipo} value={datos.nueva} onChange={cambiar('nueva')} autoComplete="new-password" className={campo} />
        </Campo>
        <Campo label="Confirmar nueva contraseña">
          <input type={tipo} value={datos.confirmar} onChange={cambiar('confirmar')} autoComplete="new-password" className={campo} />
        </Campo>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-4 mt-6 pt-5 border-t border-line">
        <Resultado {...estado} textoListo="Contraseña actualizada" />
        <button type="submit" disabled={estado.guardando} className={botonPrincipal}>
          {estado.guardando ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
      </div>
    </form>
  )
}
