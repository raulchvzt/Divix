# Divix · Plan de pruebas manuales

Documento para probar a mano el sistema (rama **develop**). Cada módulo tiene su tabla: se ejecutan los pasos, se compara con el **resultado esperado** y se anota lo que realmente pasó en **Resultado obtenido** (la columna que está vacía a propósito).

## Antes de empezar

| Dato | Valor |
|---|---|
| Backend | Dentro de `backend/`: `DB_DRIVER=json`, `JSON_DB_PATH=./data`, `JWT_SECRET=...`, `SEED_PASSWORD=...`, `SEED_DEMO=false` y `REFERENCIA_MERCADO=off`; después `npm run start:dev` |
| Frontend | Dentro de `frontend/`: `npm run dev` (normalmente http://localhost:5173) |
| Usuarios de la base JSON | `admin` (administrador) y `cajero1` (cajero); contraseña = la de `SEED_PASSWORD` |
| Divisas de ejemplo | USD (compra $17.50 / venta $18.20) y EUR (compra $19.00 / venta $19.90) |
| Base limpia | Para repetir todo desde cero: detener el backend, borrar la carpeta `data` y volver a arrancar |

> Si cambias los tipos de cambio durante las pruebas, ajusta los importes esperados de las demás tablas.
> Si encuentras un error, anótalo en **Resultado obtenido** con lo que viste (mensaje, captura, hora) y avisa al equipo.

---

## 1. Login

| ID | Caso | Pasos | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|
| LOG-01 | Acceso correcto como administrador | 1. Abrir la app sin sesión.<br>2. Escribir `admin` y su contraseña.<br>3. Pulsar entrar. | Entra al sistema y se ve el menú completo, incluida **Configuración**. | |
| LOG-02 | Acceso correcto como cajero | 1. Cerrar sesión.<br>2. Entrar con `cajero1`. | Entra al sistema; el menú **no** muestra Configuración. | |
| LOG-03 | Contraseña incorrecta | 1. Escribir `admin` con una contraseña equivocada.<br>2. Pulsar entrar. | Mensaje de "Usuario o contraseña incorrectos"; no entra. | |
| LOG-04 | Usuario que no existe | 1. Escribir `fantasma` y cualquier contraseña. | Mismo mensaje de error; no entra. | |
| LOG-05 | Campos vacíos | 1. Dejar usuario y contraseña vacíos.<br>2. Pulsar entrar. | No entra; se pide llenar los campos. | |
| LOG-06 | Entrar sin sesión a una pantalla interna | 1. Sin haber iniciado sesión, escribir en la barra de direcciones `/caja`. | Redirige a la pantalla de login. | |
| LOG-07 | Cerrar sesión | 1. Iniciar sesión.<br>2. Usar la opción de cerrar sesión.<br>3. Pulsar "atrás" en el navegador. | Regresa al login y no se puede volver a ver pantallas internas sin entrar de nuevo. | |
| LOG-08 | Usuario desactivado | 1. Como admin, desactivar a un usuario en Configuración → Usuarios.<br>2. Intentar entrar con ese usuario. | No puede entrar. | |

## 2. Permisos

| ID | Caso | Pasos | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|
| PER-01 | Cajero no ve Configuración | 1. Entrar como `cajero1`.<br>2. Revisar el menú lateral. | No aparece Configuración. | |
| PER-02 | Cajero entra a Configuración por URL | 1. Como cajero, escribir `/configuracion` en la barra de direcciones. | Lo regresa a su pantalla de inicio; no ve la configuración. | |
| PER-03 | Administrador ve todo | 1. Entrar como `admin`.<br>2. Abrir cada opción del menú. | Todas las pantallas abren sin error. | |
| PER-04 | Cajero no crea usuarios ni divisas | 1. Como cajero, buscar dónde crear un usuario o una divisa. | No existe la opción para el cajero. | |
| PER-05 | Cajero no desactiva clientes | 1. Como cajero, editar un cliente.<br>2. Buscar alguna forma de desactivarlo. | El cajero puede editar datos del cliente pero no desactivarlo. | |
| PER-06 | Cada cajero ve solo sus operaciones | 1. Registrar una operación con `cajero1`.<br>2. Entrar como otro cajero (crearlo antes) y abrir **Operaciones**. | El otro cajero no ve la operación de `cajero1`; el admin sí ve todas. | |
| PER-07 | Sesión vencida o token inválido | 1. Iniciar sesión.<br>2. En las herramientas del navegador, borrar el token guardado.<br>3. Recargar. | Regresa al login. | |

## 3. Ventanilla

| ID | Caso | Pasos | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|
| VEN-01 | Caja cerrada bloquea operar | 1. Entrar con un usuario sin caja abierta.<br>2. Abrir **Ventanilla**. | Aviso "Tu caja está cerrada" con botón **Abrir caja**; no se puede registrar la operación. | |
| VEN-02 | Resumen de hoy | 1. Abrir caja.<br>2. Ir a Ventanilla. | Se ven compras, ventas, número de operaciones y efectivo inicial; al inicio, compras y ventas en $0. | |
| VEN-03 | Venta de USD | 1. Con caja abierta con USD suficiente, elegir USD y **Venta**.<br>2. Capturar 100 USD y un cliente.<br>3. Confirmar. | Total $1,820.00 MXN (100 × 18.20). La operación se registra y baja el USD en caja. | |
| VEN-04 | Compra de USD | 1. Elegir USD y **Compra**.<br>2. Capturar 100 USD.<br>3. Confirmar. | Total $1,750.00 MXN (100 × 17.50). Sube el USD en caja y bajan los pesos. | |
| VEN-05 | Venta de EUR | 1. Elegir EUR y **Venta**, 100 EUR. | Total $1,990.00 MXN (100 × 19.90). | |
| VEN-06 | Vender más divisa de la que hay | 1. Intentar vender más USD que el saldo disponible. | Mensaje tipo "No hay suficiente USD en tu caja…"; no se registra. | |
| VEN-07 | Comprar sin pesos suficientes | 1. Abrir caja con muy pocos pesos.<br>2. Intentar comprar una cantidad grande de USD. | Mensaje de que no hay suficientes pesos en caja; no se registra. | |
| VEN-08 | Cantidad cero, negativa o texto | 1. Escribir 0, -5 y letras como cantidad. | No permite confirmar o muestra error; no se registra nada. | |
| VEN-09 | Operar sin cliente | 1. Dejar el cliente sin seleccionar.<br>2. Intentar confirmar. | No permite continuar sin cliente. | |
| VEN-10 | Crear cliente nuevo | 1. Crear un cliente con nombre, apellido e identificación. | El cliente queda disponible para operar. | |
| VEN-11 | Cliente sin nombre | 1. Intentar crear un cliente dejando el nombre vacío. | No se crea; se pide el nombre. | |
| VEN-12 | Identificación repetida | 1. Crear otro cliente con la misma identificación de uno existente. | No se crea; avisa que ya existe. | |
| VEN-13 | Saldo disponible visible | 1. Cambiar entre divisas en la captura. | Debajo del monto se indica cuánto hay en caja de la divisa elegida. | |
| VEN-14 | Tabla de operaciones del día | 1. Registrar 2 o 3 operaciones. | Aparecen en la tabla de la pantalla con tipo, divisa, cantidad y total correctos. | |

## 4. Ticket

| ID | Caso | Pasos | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|
| TIC-01 | Ticket al terminar una operación | 1. Registrar una venta de USD.<br>2. Revisar el ticket que aparece. | Muestra folio, fecha y hora, cajero, cliente, divisa, cantidad, tipo de cambio y total. | |
| TIC-02 | Datos del ticket correctos | 1. Comparar el ticket con lo capturado. | Cantidad, tipo de cambio aplicado y total coinciden (ej. 100 USD × 18.20 = $1,820.00). | |
| TIC-03 | Billetes en el ticket | 1. Registrar una operación de USD indicando billetes. | El ticket lista los billetes por denominación. | |
| TIC-04 | Imprimir | 1. Pulsar imprimir en el ticket. | Se abre la vista de impresión con el ticket legible y sin elementos del menú. | |
| TIC-05 | Datos del negocio | 1. Como admin, llenar nombre, RFC y dirección en Configuración → Negocio.<br>2. Registrar una operación. | El ticket muestra los datos del negocio capturados. | |
| TIC-06 | Cerrar el ticket | 1. Cerrar el ticket. | Regresa a Ventanilla lista para otra operación. | |

## 5. Caja y corte

| ID | Caso | Pasos | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|
| CAJ-01 | Abrir caja con fondo inicial | 1. Ir a **Caja**.<br>2. Capturar pesos en caja fuerte (ej. 100,000), pesos del cajero (ej. 10,000) y USD 1,000.<br>3. Registrar fondo inicial. | La caja queda abierta con esos saldos; la tarjeta del menú muestra "Caja abierta", la hora y los pesos. | |
| CAJ-02 | No abrir dos cajas | 1. Con caja abierta, intentar abrir otra. | No lo permite (ya hay un corte abierto). | |
| CAJ-03 | Reposición al cajero | 1. Pasar $2,000 de la caja fuerte al cajero. | Caja fuerte baja $2,000 y cajero sube $2,000; el total no cambia. | |
| CAJ-04 | Entrada de efectivo | 1. Registrar una entrada de $500 MXN con concepto. | El saldo de pesos sube $500 y el movimiento aparece en la lista. | |
| CAJ-05 | Salida de efectivo | 1. Registrar una salida de $300 MXN con concepto. | El saldo de pesos baja $300 y aparece en la lista de movimientos. | |
| CAJ-06 | Salida mayor al saldo | 1. Intentar sacar más de lo que hay de una divisa. | Mensaje tipo "No hay suficiente efectivo en … para esa salida"; no se registra. | |
| CAJ-07 | Movimiento sin concepto | 1. Registrar una entrada o salida sin escribir concepto. | Pide escribir el concepto; no se registra. | |
| CAJ-08 | Saldos esperados tras vender | 1. Abrir caja con $10,000 MXN y 1,000 USD.<br>2. Vender 100 USD en Ventanilla.<br>3. Volver a Caja. | Esperados: USD 900 y MXN $11,820.00 (divisa menos, pesos más). | |
| CAJ-09 | Saldos esperados tras comprar | 1. Con la misma caja, comprar 40 USD. | USD sube 40 y los pesos bajan $700.00 (40 × 17.50). | |
| CAJ-10 | Corte sin diferencias | 1. Ir al corte de cierre.<br>2. Capturar exactamente lo esperado.<br>3. Guardar. | La caja se cierra; las diferencias son $0. | |
| CAJ-11 | Corte con faltante | 1. En otro turno, contar $50 MXN menos de lo esperado.<br>2. Guardar el corte. | El corte guarda diferencia de −$50 y la caja queda cerrada. | |
| CAJ-12 | Abrir con el último cierre | 1. Tras cerrar, pulsar **Abrir con el último cierre**. | La nueva caja inicia con lo contado en el corte anterior. | |
| CAJ-13 | Aviso de caja cerrada | 1. Con la caja cerrada, abrir la campana de avisos. | Aparece el aviso de caja cerrada y la tarjeta del menú dice "Caja cerrada · Ir a caja". | |
| CAJ-14 | Cortes anteriores (administrador) | 1. Como admin, consultar los cortes de los cajeros. | Se ven los cortes con fecha, cajero y diferencias. | |

## 6. Billetes USD

| ID | Caso | Pasos | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|
| BIL-01 | Abrir con billetes | 1. En Caja, capturar USD por denominación (ej. 5 de $100 y 10 de $20).<br>2. Registrar fondo inicial. | El saldo de USD es $700 y el inventario muestra 5 billetes de $100 y 10 de $20. | |
| BIL-02 | Venta con billetes que sí hay | 1. Vender 140 USD entregando 1 de $100 y 2 de $20. | Se registra; el inventario baja a 4 de $100 y 8 de $20. | |
| BIL-03 | Entregar billetes que no hay | 1. Vender 50 USD entregando un billete de $50 sin tener ninguno. | Mensaje "No hay suficientes billetes de $50…"; no se registra. | |
| BIL-04 | Entregar más billetes de los que hay | 1. Intentar entregar más billetes de $20 de los disponibles. | Mensaje de que no hay suficientes billetes de esa denominación. | |
| BIL-05 | Billetes que no cuadran con el importe | 1. Capturar 100 USD pero indicar un solo billete de $50. | Mensaje tipo "Los billetes suman $50 pero el importe es $100.00"; no se registra. | |
| BIL-06 | Cantidad de dólares con decimales | 1. Capturar 10.50 USD con billetes. | No se permite: los dólares se operan en cantidad entera. | |
| BIL-07 | Compra con billetes | 1. Comprar 50 USD recibiendo un billete de $50. | Se registra y el inventario sube un billete de $50. | |
| BIL-08 | Sugerencia de billetes | 1. Vender USD y revisar el selector de billetes. | Sugiere qué billetes entregar, muestra cuántos hay y confirma si cuadra. | |
| BIL-09 | Conteo de billetes en el corte | 1. En el corte, contar un billete de $20 menos que el esperado. | Se marca la diferencia por denominación ("falta 1 de $20"). | |
| BIL-10 | Salida de USD con billetes | 1. Registrar una salida de USD eligiendo billetes. | El inventario baja justo esos billetes. | |

## 7. Tipos de cambio

| ID | Caso | Pasos | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|
| TC-01 | Ver tipos de cambio | 1. Abrir **Tipos de cambio**. | Se ven compra y venta por divisa y el margen por unidad (pesos y porcentaje). | |
| TC-02 | Editar precios (administrador) | 1. Como admin, cambiar USD a compra 17.60 y venta 18.30.<br>2. Guardar. | Los nuevos precios se muestran y se conserva el historial. | |
| TC-03 | Nueva operación usa el precio nuevo | 1. Tras TC-02, vender 100 USD. | Total $1,830.00 (100 × 18.30). | |
| TC-04 | Compra mayor que venta | 1. Intentar guardar compra 19.00 y venta 18.00. | Lo rechaza (la compra no puede ser mayor a la venta). | |
| TC-05 | Precios en cero o negativos | 1. Intentar guardar 0 o un valor negativo. | Lo rechaza. | |
| TC-06 | Cajero no edita precios | 1. Entrar como cajero y abrir Tipos de cambio. | Puede consultarlos pero no modificarlos. | |
| TC-07 | Historial | 1. Abrir el historial de una divisa. | Aparecen los cambios anteriores ordenados del más reciente al más antiguo. | |
| TC-08 | Referencia de mercado | 1. Con `REFERENCIA_MERCADO=off`, revisar la pantalla. | No se muestra referencia de mercado o se indica que está desactivada; no hay errores. | |
| TC-09 | Divisas en Configuración | 1. Como admin, crear una divisa nueva (ej. GBP).<br>2. Desactivar otra. | La nueva aparece en el catálogo; la desactivada ya no sale en Ventanilla. | |

## 8. Operaciones

| ID | Caso | Pasos | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|
| OPE-01 | Historial | 1. Registrar varias operaciones.<br>2. Abrir **Operaciones**. | Aparecen todas con ID, fecha, cajero, cliente, tipo, divisa, cantidad y total. | |
| OPE-02 | Totales | 1. Comparar los totales de la pantalla con la suma de las operaciones. | Los totales coinciden. | |
| OPE-03 | Filtro por tipo | 1. Filtrar por **Ventas**. | Solo se ven ventas. | |
| OPE-04 | Filtro por divisa | 1. Filtrar por EUR. | Solo se ven operaciones de EUR. | |
| OPE-05 | Filtros combinados | 1. Filtrar **Ventas + EUR**. | Solo ventas de EUR. | |
| OPE-06 | Filtro por fecha | 1. Elegir un rango de fechas que incluya hoy y otro que no. | Con hoy se ven operaciones; con el otro rango, ninguna. | |
| OPE-07 | Búsqueda por ID o cajero | 1. Buscar un ID de operación.<br>2. Buscar el nombre de un cajero. | Muestra solo lo que coincide. | |
| OPE-08 | Sin resultados | 1. Buscar algo que no existe. | Mensaje de que no hay resultados, sin errores. | |
| OPE-09 | Cajero solo ve las suyas | 1. Entrar como cajero con operaciones de otro cajero registradas. | Solo ve las propias. | |
| OPE-10 | Datos guardados no cambian | 1. Cambiar el tipo de cambio.<br>2. Revisar una operación anterior. | La operación vieja conserva el tipo de cambio y el total con que se hizo. | |

## 9. Estadísticas

| ID | Caso | Pasos | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|
| EST-01 | Abrir Estadísticas | 1. Abrir **Estadísticas**. | Carga ("Cargando…") y luego muestra indicadores y gráficas sin errores. | |
| EST-02 | Periodos | 1. Cambiar entre Hoy, 7 días, 30 días y Todo. | Los indicadores se actualizan en cada cambio. | |
| EST-03 | Cifras correctas | 1. Con operaciones conocidas, comparar compras y ventas con **Operaciones**. | Los montos coinciden. | |
| EST-04 | Compras vs ventas | 1. Revisar la gráfica de reparto. | Los porcentajes corresponden a los montos. | |
| EST-05 | Volumen por divisa y por cajero | 1. Revisar las gráficas. | Cada divisa y cada cajero aparecen con sus montos. | |
| EST-06 | Horario con más movimiento | 1. Revisar la gráfica de horarios. | Se marca la hora en que se hicieron las operaciones. | |
| EST-07 | Pronóstico de demanda | 1. Bajar al pronóstico y elegir divisa y tipo. | Muestra el pronóstico sin error; con pocos datos, un aviso razonable. | |
| EST-08 | Sin operaciones | 1. Usar una base limpia y abrir Estadísticas. | Todo en cero y sin pantallas rotas. | |

## 10. Divix AI

> Necesita `DEEPSEEK_API_KEY` o `ANTHROPIC_API_KEY` en `backend/.env`. Si no hay clave, las pruebas IA-05 y IA-06 verifican el comportamiento sin ella.

| ID | Caso | Pasos | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|
| IA-01 | Abrir el chat | 1. Pulsar **Divix AI** en el menú. | Se abre el panel junto al menú, en cualquier pantalla. | |
| IA-02 | Preguntas sugeridas | 1. Revisar las sugerencias.<br>2. Pulsar una. | Se envía la pregunta y llega una respuesta. | |
| IA-03 | Respuesta con datos reales | 1. Preguntar "¿cuántas operaciones hubo hoy?" tras registrar algunas. | La respuesta coincide con lo que muestra Operaciones. | |
| IA-04 | Historial y nueva conversación | 1. Hacer dos preguntas.<br>2. Abrir el historial.<br>3. Iniciar una nueva conversación. | El historial guarda las consultas; la nueva conversación empieza limpia. | |
| IA-05 | Mensaje vacío | 1. Intentar enviar sin escribir nada. | No se envía. | |
| IA-06 | Sin clave configurada | 1. Quitar la clave y reiniciar el backend.<br>2. Hacer una pregunta. | Muestra un mensaje de error claro; la app sigue funcionando. | |
| IA-07 | Cerrar el panel | 1. Cerrar el chat. | Se cierra y el resto de la pantalla sigue normal. | |

## 11. Mi perfil

| ID | Caso | Pasos | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|
| PRF-01 | Abrir el perfil | 1. Pulsar el nombre del usuario en la barra superior. | Se ve foto, usuario, rol, correo y fecha de registro. | |
| PRF-02 | Cambiar foto (cajero) | 1. Como cajero, pulsar el botón de cambiar foto.<br>2. Elegir una imagen JPG o PNG. | La foto se actualiza y se mantiene al recargar. | |
| PRF-03 | Quitar la foto | 1. Quitar la foto actual. | Vuelve la imagen por defecto. | |
| PRF-04 | Archivo que no es imagen | 1. Intentar subir un PDF o un documento como foto. | Lo rechaza con mensaje. | |
| PRF-05 | Cajero no cambia nombre ni correo | 1. Como cajero, intentar editar nombre o correo. | No se permite (solo el administrador cambia esos datos). | |
| PRF-06 | Administrador cambia sus datos | 1. Como admin, cambiar su nombre y guardar. | Se guarda y se refleja en la barra superior y en tickets/cortes nuevos. | |
| PRF-07 | Correo repetido | 1. Como admin, poner el correo de otro usuario. | Lo rechaza por correo ya existente. | |
| PRF-08 | Cambiar contraseña | 1. Escribir contraseña actual y una nueva de 8 o más caracteres.<br>2. Guardar.<br>3. Cerrar sesión y entrar con la nueva. | Entra con la nueva; la anterior ya no funciona. | |
| PRF-09 | Contraseña actual incorrecta | 1. Escribir mal la contraseña actual. | Mensaje "La contraseña actual no es correcta". | |
| PRF-10 | Contraseña nueva muy corta | 1. Escribir una nueva de menos de 8 caracteres. | La rechaza con mensaje. | |

## 12. Vista en celular

> Probar con el modo responsivo del navegador (F12 → icono de dispositivo móvil), por ejemplo a 375 × 667, o desde un celular real conectado a la misma red.

| ID | Caso | Pasos | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|
| CEL-01 | Login en celular | 1. Abrir la app en vista móvil. | El formulario se ve completo, sin cortarse ni desplazarse de lado. | |
| CEL-02 | Menú | 1. Abrir y cerrar el menú lateral. | Se puede abrir y cerrar; todas las opciones son tocables. | |
| CEL-03 | Ventanilla | 1. Registrar una operación desde vista móvil. | Los campos y botones se usan sin problema; no hay textos encimados. | |
| CEL-04 | Ticket | 1. Ver el ticket tras una operación. | Se ve completo y legible. | |
| CEL-05 | Tablas | 1. Abrir Operaciones. | La tabla se desplaza horizontalmente dentro de su caja, sin romper la página. | |
| CEL-06 | Caja y billetes | 1. Abrir Caja y el selector de billetes. | Se pueden capturar los billetes sin que se encimen los campos. | |
| CEL-07 | Estadísticas | 1. Abrir Estadísticas. | Las gráficas se ajustan al ancho. | |
| CEL-08 | Divix AI | 1. Abrir el chat. | Se puede escribir y leer las respuestas. | |
| CEL-09 | Mi perfil | 1. Abrir Mi perfil. | Se ve y se puede editar sin problemas. | |
| CEL-10 | Girar el celular | 1. Cambiar a horizontal y regresar. | La pantalla se reacomoda sin perder lo capturado. | |
