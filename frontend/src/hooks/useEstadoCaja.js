import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { corteActivo } from '../api/operaciones'
import { obtenerReferenciaMercado } from '../api/divisas'
import { useCarga } from '../api/useCarga'

/**
 * Estado compartido del encabezado y el menú: la caja del usuario y la
 * referencia del mercado. Se recarga al cambiar de pantalla y cuando otra
 * pantalla avisa que la caja cambió (abrir, cerrar, registrar operación).
 */

const EVENTO = 'divix:caja-cambio'

/** Llamar después de abrir/cerrar caja o registrar algo que mueva saldos. */
export const avisarCambioCaja = () => window.dispatchEvent(new Event(EVENTO))

export function useEstadoCaja() {
  const { pathname } = useLocation()
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const alCambiar = () => setVersion((v) => v + 1)
    window.addEventListener(EVENTO, alCambiar)
    return () => window.removeEventListener(EVENTO, alCambiar)
  }, [])

  const caja = useCarga(corteActivo, [pathname, version])
  const mercado = useCarga(obtenerReferenciaMercado, [pathname])
  return { corte: caja.datos, cargando: caja.cargando, mercado: mercado.datos ?? {} }
}
