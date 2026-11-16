/**
 * Convierte la imagen elegida en un JPEG cuadrado de 256 px (recortada al
 * centro) como data URL. Así pesa unos pocos KB y cabe en la base.
 */
const LADO = 256
const MAXIMO = 90_000 // mismo límite que el backend

export function prepararFoto(archivo) {
  return new Promise((resolver, rechazar) => {
    if (!archivo.type.startsWith('image/')) {
      rechazar(new Error('Elige una imagen (JPG, PNG o WebP).'))
      return
    }
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const lado = Math.min(img.naturalWidth, img.naturalHeight)
      const lienzo = document.createElement('canvas')
      lienzo.width = LADO
      lienzo.height = LADO
      lienzo
        .getContext('2d')
        .drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, LADO, LADO)
      for (const calidad of [0.85, 0.7, 0.55, 0.4]) {
        const dato = lienzo.toDataURL('image/jpeg', calidad)
        if (dato.length <= MAXIMO) return resolver(dato)
      }
      rechazar(new Error('La imagen es demasiado pesada. Prueba con otra.'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      rechazar(new Error('No se pudo leer la imagen.'))
    }
    img.src = url
  })
}
