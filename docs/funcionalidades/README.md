# Divix · Funcionalidades del sistema (versión develop)

Recorrido por cada módulo de Divix con capturas del sistema funcionando en local con el código de la rama **develop** (backend NestJS con base JSON de desarrollo + frontend React/Vite), con el usuario **Administrador**.

Las capturas siguen un día de trabajo: se abre la caja con el fondo inicial, se registran movimientos y operaciones en Ventanilla, se hace el corte y al final se consultan tipos de cambio, historial, estadísticas, perfil y configuración.

### Novedades de develop que aparecen en este recorrido

- **Mi perfil:** cada usuario edita su nombre, correo, foto y contraseña.
- **Campana de avisos:** notifica, por ejemplo, cuando la caja está cerrada.
- **Tarjeta de caja en el menú lateral:** muestra si la caja está abierta, desde qué hora y cuántos pesos hay en caja, con datos reales.
- **Validaciones de operación:** no se puede operar con la caja cerrada, y no se permiten salidas ni ventas por encima del efectivo disponible de cada divisa.
- **Saldo disponible en Ventanilla:** al capturar una operación se ve cuánto hay en caja de esa divisa.

## Índice

1. [Inicio de sesión](#1-inicio-de-sesión)
2. [Caja cerrada y avisos](#2-caja-cerrada-y-avisos)
3. [Caja y cortes: apertura y movimientos](#3-caja-y-cortes-apertura-y-movimientos)
4. [Ventanilla: compras y ventas](#4-ventanilla-compras-y-ventas)
5. [Caja y cortes: corte de cierre](#5-caja-y-cortes-corte-de-cierre)
6. [Tipos de cambio](#6-tipos-de-cambio)
7. [Operaciones](#7-operaciones)
8. [Estadísticas y pronóstico de demanda](#8-estadísticas-y-pronóstico-de-demanda)
9. [Mi perfil](#9-mi-perfil)
10. [Configuración](#10-configuración)
11. [Divix AI](#11-divix-ai)
12. [Resumen de los datos usados en la demostración](#12-resumen-de-los-datos-usados-en-la-demostración)

---

## 1. Inicio de sesión

Acceso con usuario y contraseña. La sesión está protegida con JWT y cada usuario tiene un rol (**Administrador** o **Cajero**) que define qué módulos ve.

![Inicio de sesión](capturas/01-login.jpg)

---

## 2. Caja cerrada y avisos

Si no hay corte abierto, Ventanilla **no permite operar**: muestra el aviso "Tu caja está cerrada" con el botón **Abrir caja**, y la tarjeta del menú lateral indica "Caja cerrada · Ir a caja".

![Ventanilla con caja cerrada](capturas/02-ventanilla-caja-cerrada.jpg)

La **campana de avisos** de la barra superior muestra el contador y el detalle de cada aviso.

![Campana de avisos](capturas/03-avisos-caja-cerrada.jpg)

---

## 3. Caja y cortes: apertura y movimientos

### 3.1 Registrar fondo inicial

Se captura el efectivo con el que arranca la caja:

- **Pesos en caja fuerte (MXN):** 1,000,000
- **Pesos del cajero (MXN):** 100,000
- **Otras divisas:** CAD 4,955 · CHF 1,780 · GBP 945 · EUR 29,770
- **Dólares por denominación:** se captura el importe por billete y el sistema calcula cuántos billetes son.

| Billete | Importe USD | Billetes |
|---|---:|---:|
| $100 | 37,900 | 379 |
| $50 | 1,300 | 26 |
| $20 | 7,760 | 388 |
| $10 | 340 | 34 |
| $5 | 450 | 90 |
| $2 | 402 | 201 |
| $1 | 234 | 234 |
| **Total** | **$48,386** | **1,352** |

![Registrar fondo inicial](capturas/04-caja-fondo-inicial.jpg)

### 3.2 Caja abierta

Se muestran la caja fuerte, la caja del cajero, el total disponible y los saldos por divisa. La tarjeta lateral cambia a **Caja abierta**, con la hora de apertura y los pesos en caja.

![Caja abierta](capturas/05-caja-abierta-saldos.jpg)

Inventario de **billetes de USD** por denominación, más los formularios de reposición y de entradas/salidas.

![Billetes y formularios](capturas/06-caja-billetes-y-formularios.jpg)

### 3.3 Reposición al cajero

Se pasaron **$50,000 MXN** de la caja fuerte al cajero (caja fuerte $950,000 · cajero $150,000). El total no cambia.

![Reposición](capturas/07-caja-reposicion.jpg)

### 3.4 Entradas y salidas de efectivo

- **Entrada MXN:** $2,500 · "Fondo adicional de gerencia".

![Entrada de efectivo](capturas/08-caja-entrada-efectivo.jpg)

- **Salida USD:** $350 · "Traspaso a sucursal centro". El **selector de billetes** sugiere qué entregar (3 de $100 + 1 de $50), muestra cuántos hay y confirma que cuadra.

![Salida de USD](capturas/09-caja-salida-usd-billetes.jpg)

### 3.5 Movimientos del turno

![Movimientos del turno](capturas/10-caja-movimientos-turno.jpg)

### 3.6 Validación de saldo suficiente

Si se intenta sacar más efectivo del que hay, el sistema lo rechaza. Ejemplo: una salida de **5,000 CHF** cuando solo hay 1,780 muestra "No hay suficiente efectivo en CHF para esa salida".

![Saldo insuficiente en caja](capturas/11-caja-saldo-insuficiente.jpg)

---

## 4. Ventanilla: compras y ventas

### 4.1 Resumen de hoy

Total de compras, total de ventas, operaciones del día y efectivo inicial de caja. Debajo del monto se indica **cuánto hay en caja** de la divisa elegida.

![Resumen de hoy](capturas/12-ventanilla-resumen.jpg)

### 4.2 Compra de USD

Compra de **500 USD** a $17.50 = **$8,750.00 MXN**, con los billetes recibidos (3 de $100 + 4 de $50). En compras se muestran los **pesos disponibles en caja** para pagar.

![Compra de USD](capturas/13-ventanilla-compra-usd.jpg)

Ticket imprimible con folio, fecha, cajero, cliente, tipo de cambio, billetes y total.

![Ticket de compra](capturas/14-ventanilla-ticket-compra.jpg)

### 4.3 Venta de EUR

Venta de **1,200 EUR** a $19.90 = **$23,880.00 MXN**.

![Ticket de venta EUR](capturas/15-ventanilla-ticket-venta-eur.jpg)

### 4.4 Validación de existencias

Al intentar vender **60,000 USD** el sistema avisa en el momento: "No hay suficiente USD en tu caja: tienes 48,536.00".

![Venta sin existencias suficientes](capturas/16-ventanilla-venta-saldo-insuficiente.jpg)

### 4.5 Venta de USD con billetes entregados

Venta de **275 USD** a $18.20 = $5,005.00 MXN. Se sugieren los billetes a entregar (2 de $100, 1 de $50, 1 de $20, 1 de $5).

![Venta de USD con billetes](capturas/17-ventanilla-venta-usd-billetes.jpg)

### 4.6 Resumen actualizado

**$8,750.00 en compras**, **$28,885.00 en ventas** y **3 operaciones**. La tarjeta lateral refleja los pesos en caja: $172,635.00.

![Resumen con operaciones](capturas/18-ventanilla-resumen-con-operaciones.jpg)

---

## 5. Caja y cortes: corte de cierre

### 5.1 Saldos esperados

| Concepto | Esperado |
|---|---:|
| Caja fuerte MXN | $950,000.00 |
| Cajero MXN | $172,635.00 (150,000 + 2,500 − 8,750 + 23,880 + 5,005) |
| USD | $48,261.00 (48,386 − 350 + 500 − 275) |
| EUR | $28,570.00 (29,770 − 1,200) |
| CAD / CHF / GBP | sin cambios |

![Saldos antes del corte](capturas/19-caja-saldos-antes-del-corte.jpg)

### 5.2 Conteo de cierre

Se captura el efectivo contado. Junto a cada campo aparecen el esperado y la diferencia, y en dólares se compara billete por billete. Se simuló un **faltante de $50 MXN** y **un billete de $20 USD** de menos.

![Conteo de cierre](capturas/20-corte-conteo-de-cierre.jpg)

### 5.3 Corte guardado

La caja queda **cerrada** y lo contado será el fondo de la siguiente apertura. La campana vuelve a avisar que la caja está cerrada.

![Corte guardado](capturas/21-corte-guardado-saldos.jpg)

Diferencias por moneda y detalle de billetes ("falta 1 de $20"). Con **Abrir con el último cierre** inicia el siguiente turno.

![Diferencias del corte](capturas/22-corte-guardado-diferencias.jpg)

---

## 6. Tipos de cambio

Precios de compra y venta por divisa, con el **margen por unidad** en pesos y porcentaje.

![Tipos de cambio](capturas/23-tipos-de-cambio.jpg)

Edición de precios. La referencia del mercado (Banxico FIX / BCE) es informativa (en esta demo estaba desactivada con `REFERENCIA_MERCADO=off`).

![Editar tipo de cambio](capturas/24-tipos-de-cambio-editar.jpg)

---

## 7. Operaciones

Historial completo con totales. Arriba aparecen las 3 operaciones de la demo (#2682, #2683 y #2684).

![Historial de operaciones](capturas/25-operaciones-historial.jpg)

Búsqueda por ID o cajero y filtros por tipo, divisa y fecha. Ejemplo: **Ventas + EUR**.

![Operaciones filtradas](capturas/26-operaciones-filtros.jpg)

---

## 8. Estadísticas y pronóstico de demanda

Indicadores por periodo (Hoy, 7 días, 30 días, Todo), volumen de compras y ventas, y reparto compras vs ventas.

![Indicadores](capturas/27-estadisticas-indicadores.jpg)

Volumen por divisa, desempeño por cajero y horario con más movimiento.

![Gráficas](capturas/28-estadisticas-graficas.jpg)

**Pronóstico de demanda** por divisa y tipo (ventas/compras), con los meses fuertes, el efectivo extra recomendado y el error promedio del modelo.

![Pronóstico de demanda](capturas/29-estadisticas-pronostico-demanda.jpg)

---

## 9. Mi perfil

Pantalla nueva, a la que se entra desde el nombre del usuario en la barra superior. Muestra la foto (con botón para cambiarla), el usuario, el rol, el correo y la fecha de registro. Permite editar los **datos personales**, que aparecen en tickets y cortes.

![Mi perfil - datos](capturas/30-perfil-datos.jpg)

Cambio de **contraseña** (mínimo 8 caracteres), pensado para reemplazar una contraseña temporal.

![Mi perfil - contraseña](capturas/31-perfil-contrasena.jpg)

---

## 10. Configuración

Solo para el administrador.

**Negocio:** nombre, RFC, teléfono, correo, dirección y horario.

![Configuración - negocio](capturas/32-configuracion-negocio.jpg)

**Usuarios:** alta, rol y activación.

![Configuración - usuarios](capturas/33-configuracion-usuarios.jpg)

**Divisas:** solo las activas aparecen en Ventanilla.

![Configuración - divisas](capturas/34-configuracion-divisas.jpg)

Al agregar una divisa se sugieren códigos **ISO 4217** con bandera, nombre y símbolo.

![Agregar divisa](capturas/35-configuracion-agregar-divisa.jpg)

---

## 11. Divix AI

Asistente que responde con los datos reales del negocio. Trae preguntas sugeridas, historial y opción de nueva conversación.

> Para que responda, el backend necesita `DEEPSEEK_API_KEY` o `ANTHROPIC_API_KEY` en `backend/.env`.

![Divix AI](capturas/36-divix-ai.jpg)

---

## 12. Resumen de los datos usados en la demostración

| Paso | Acción | Resultado |
|---|---|---|
| Apertura | Fondo inicial (caja fuerte 1,000,000 · cajero 100,000 · USD 48,386 · CAD 4,955 · CHF 1,780 · GBP 945 · EUR 29,770) | Caja abierta, total MXN $1,100,000 |
| Reposición | $50,000 de caja fuerte al cajero | Caja fuerte $950,000 · cajero $150,000 |
| Entrada | $2,500 MXN · Fondo adicional de gerencia | Cajero $152,500 |
| Salida | $350 USD · Traspaso a sucursal centro | USD $48,036 |
| Salida rechazada | 5,000 CHF (hay 1,780) | Bloqueada por saldo insuficiente |
| Compra #2682 | 500 USD a $17.50 | Cajero −$8,750 · USD +500 |
| Venta #2683 | 1,200 EUR a $19.90 | Cajero +$23,880 · EUR −1,200 |
| Venta rechazada | 60,000 USD | Bloqueada: solo hay 48,536 USD |
| Venta #2684 | 275 USD a $18.20 | Cajero +$5,005 · USD −275 |
| Corte | Faltante de $50 MXN y un billete de $20 USD | Diferencias MXN −$50 y USD −$20; caja cerrada |
