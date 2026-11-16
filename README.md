# Divix

**Sistema de control cambiario para casas de cambio.** Registra compras y ventas de divisas, controla la caja de cada cajero y sus cortes, administra los tipos de cambio contra la referencia del mercado y ofrece estadísticas, pronóstico de demanda y un asistente con IA.

```
divix/
├── backend/    API en NestJS (TypeScript) · MySQL o base JSON para desarrollo
└── frontend/   Aplicación web en React + Vite
```

## Funcionalidades

| Módulo | Qué hace |
|---|---|
| **Inicio de sesión y roles** | Administrador y cajero, con sesión protegida (JWT). |
| **Ventanilla** | Operación rápida de compra o venta con el tipo de cambio del día y ticket imprimible. En dólares se indica qué billetes se entregan o reciben. |
| **Divix AI** | Asistente que responde preguntas sobre el negocio con los datos reales (DeepSeek o Claude de Anthropic). |
| **Tipos de cambio** | Precios de compra y venta por divisa, con banderas, comparados contra la referencia del mercado (Banxico FIX / Banco Central Europeo) y una sugerencia que nunca propone precios en pérdida. |
| **Caja y cortes** | Apertura con conteo, entradas y salidas, reposición desde la caja fuerte y cierre con faltantes o sobrantes. Control de billetes de USD por denominación. |
| **Operaciones** | Historial con búsqueda y filtros. |
| **Estadísticas** | Indicadores y gráficas por periodo, más un **pronóstico de demanda** por divisa (modelo estadístico de temporadas y tendencia, con su error medido). |
| **Configuración** | Usuarios, divisas (con sugerencias del catálogo mundial ISO 4217) y datos del negocio. |

## Cómo correrlo

Requisitos: **Node.js 20.19 o más reciente** (recomendado 22) y npm.

```bash
# 1. Clonar
git clone https://github.com/raulchvzt/divix.git
cd divix

# 2. Instalar todo (raíz, backend y frontend)
npm run instalar

# 3. Configurar las variables de entorno (una sola vez)
cp backend/.env.example backend/.env      # luego edita backend/.env y pon un JWT_SECRET
cp frontend/.env.example frontend/.env

# 4. Levantar backend y frontend juntos
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Usuarios de prueba (base JSON): `admin` y `cajero1`, con la contraseña de `SEED_PASSWORD` en `backend/.env`.

> En Windows, en lugar de `cp` usa `copy backend\.env.example backend\.env` (o copia el archivo desde el explorador).

### Comandos desde la raíz

| Comando | Qué hace |
|---|---|
| `npm run instalar` | Instala las dependencias de la raíz, el backend y el frontend |
| `npm run dev` | Levanta backend y frontend al mismo tiempo |
| `npm run dev:backend` | Solo el backend |
| `npm run dev:frontend` | Solo el frontend |
| `npm run build` | Compila los dos |
| `npm run lint` | Revisa el código de los dos |

## Base de datos

- **JSON (desarrollo):** `DB_DRIVER=json`. Guarda todo en `backend/data/` sin instalar nada. Al arrancar crea los usuarios de prueba y, si no hay operaciones, genera 2 años de operaciones ficticias para la demo (`SEED_DEMO=false` para no generarlas).
- **MySQL:** `DB_DRIVER=mysql` y las variables `DB_*`. Los cambios de estructura están en `backend/sql/` y hay que ejecutarlos a mano.

## Cómo trabajamos

1. Crea una rama desde `main` para tu tarea: `git checkout -b tu-nombre-tarea`.
2. Haz tus cambios. Pueden tocar `backend/` y `frontend/` en el mismo PR.
3. Abre un Pull Request hacia `main`, pide revisión y haz merge.
4. `main` siempre debe funcionar: es lo que se entrega.

Los archivos `.env` **no se suben** a GitHub; cada quien tiene el suyo.

## Historia del repositorio

Este repositorio une los antiguos `divix-backend` y `divix-frontend`, conservando todos sus commits y autores. El historial de cada parte se puede ver con `git log -- backend/` o `git log -- frontend/`.
