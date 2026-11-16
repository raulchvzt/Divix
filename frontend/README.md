# Divix · Frontend

Aplicación web de Divix hecha con **React 19**, **Vite** y **Tailwind CSS 4**. Se conecta al backend de Divix por su API.

> Para levantar todo el proyecto (backend + frontend) sigue el [README principal](../README.md). Aquí está el detalle del frontend.

## Pantallas

| Ruta | Pantalla | Quién |
|---|---|---|
| `/login` | Inicio de sesión | Todos |
| `/` | **Ventanilla**: resumen del día, operación rápida con ticket imprimible y últimas transacciones | Admin y cajero |
| `/tipos-de-cambio` | Precios por divisa comparados con el mercado y sugerencia de precios | Admin edita, cajero consulta |
| `/caja` | Apertura, movimientos, reposición y cierre de caja, con billetes de USD | Admin y cajero |
| `/operaciones` | Historial con búsqueda y filtros | Admin y cajero |
| `/estadisticas` | Indicadores, gráficas y pronóstico de demanda | Admin y cajero |
| `/configuracion` | Usuarios, divisas y datos del negocio | Admin |

En todas las pantallas hay un menú lateral con el estado real de la caja, una campana con avisos (caja cerrada, precios en pérdida, mercado movido) y el asistente **Divix AI**.

Qué rol ve qué pantalla se define en un solo lugar: `src/api/permisos.js`. El backend valida lo mismo.

## Estructura

```
frontend/src/
├── App.jsx               Rutas
├── pages/                Una por pantalla
├── components/
│   ├── layout/           Menú lateral, encabezado y campana de avisos
│   ├── ventanilla/       Operación rápida, ticket, Divix AI, aviso del mercado
│   ├── tipos-de-cambio/  Tarjeta de divisa y comparación con el mercado
│   ├── configuracion/    Pestañas de usuarios, divisas y negocio
│   └── estadisticas/     Pronóstico de demanda
├── api/                  Llamadas al backend (client.js agrega la sesión y renueva el token)
├── hooks/                Estado compartido (caja del usuario)
└── utils/                Formato de dinero, billetes, avisos, catálogo de divisas ISO 4217
```

## Variables de entorno

Copia `.env.example` como `.env`:

| Variable | Para qué |
|---|---|
| `VITE_API_URL` | Dirección del backend (por defecto `http://localhost:3000`). |

## Comandos

```bash
npm install       # instalar dependencias
npm run dev       # servidor de desarrollo en http://localhost:5173
npm run build     # compilar a dist/
npm run preview   # ver lo compilado
npm run lint      # revisar el código
```

Si cambias el puerto del frontend, agrega la nueva dirección a `CORS_ORIGIN` en el `.env` del backend.
