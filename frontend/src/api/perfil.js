import { api } from './client'

/**
 * Perfil del usuario con sesión. Al guardar se avisa al encabezado para que
 * cambien al momento el saludo y la foto, sin volver a iniciar sesión.
 */

const EVENTO = 'divix:perfil-cambio'
const CLAVE_USUARIO = 'divix_usuario'

export const obtenerPerfil = () => api('/usuarios/me')

export async function actualizarPerfil(cambios) {
  const perfil = await api('/usuarios/me', { method: 'PATCH', body: cambios })
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_USUARIO)) ?? {}
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify({ ...guardado, nombre: perfil.nombre }))
  } catch {
    // sin almacenamiento el nombre se actualiza al volver a entrar
  }
  window.dispatchEvent(new Event(EVENTO))
  return perfil
}

export const cambiarContrasena = (contrasenaActual, contrasenaNueva) =>
  api('/usuarios/me/password', { method: 'PATCH', body: { contrasenaActual, contrasenaNueva } })

/** Para escuchar cambios del perfil (lo usa el Layout). */
export function alCambiarPerfil(funcion) {
  window.addEventListener(EVENTO, funcion)
  return () => window.removeEventListener(EVENTO, funcion)
}
