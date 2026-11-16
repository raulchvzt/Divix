/** Foto de perfil o, si no hay, las iniciales del nombre. */

const iniciales = (nombre = '') =>
  nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?'

export default function Avatar({ nombre, foto, tamano = 36, className = '' }) {
  const estilo = { width: tamano, height: tamano, fontSize: Math.round(tamano * 0.34) }
  if (foto) {
    return <img src={foto} alt={nombre} style={estilo} className={`rounded-full object-cover shrink-0 ${className}`} />
  }
  return (
    <div
      style={estilo}
      className={`rounded-full bg-ink-800 text-white font-bold flex items-center justify-center shrink-0 ${className}`}
    >
      {iniciales(nombre)}
    </div>
  )
}
