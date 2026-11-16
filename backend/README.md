# Divix · Backend

API de Divix hecha con **NestJS 12** y **TypeORM**. Guarda los datos en **MySQL** o, para desarrollo, en una **base JSON** en archivos que no necesita instalar nada.

> Para levantar todo el proyecto (backend + frontend) sigue el [README principal](../README.md). Aquí está el detalle del backend.

## Estructura

```
backend/
├── src/
│   ├── main.ts               Arranque del servidor
│   ├── configurar-app.ts     CORS y validación (lo comparten main.ts y las pruebas)
│   ├── app.module.ts         Une todos los módulos
│   ├── modules/              Un controlador por área (rutas HTTP)
│   ├── services/             La lógica de cada área
│   ├── entities/             Tablas (TypeORM)
│   ├── dto/                  Qué datos acepta cada ruta y sus reglas
│   ├── common/               Guardas de sesión y rol, saldos de caja, billetes de USD
│   └── database/             Conexión a MySQL o a la base JSON (con su siembra inicial)
├── sql/                      Cambios de estructura para MySQL (se ejecutan a mano)
├── test/                     Pruebas e2e
└── data/                     Base JSON local (se crea sola, no se sube a GitHub)
```

## Rutas

Todas piden sesión (`Authorization: Bearer <token>`) salvo `/auth/login` y `/auth/refresh`. Entre paréntesis, quién puede usarlas cuando no son para los dos roles.

| Área | Rutas |
|---|---|
| Sesión | `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` |
| Usuarios (admin) | `GET /usuarios` · `GET/PATCH /usuarios/:id` · `POST /usuarios` · `PATCH /usuarios/:id/activar` · `PATCH /usuarios/:id/desactivar` · `PATCH /usuarios/me/password` (cualquiera) |
| Roles (admin) | `GET /roles` · `POST /roles` · `PATCH /roles/:id` |
| Clientes | `GET /clientes` · `GET /clientes/:id` · `POST /clientes` · `PATCH /clientes/:id` · `GET /clientes/:id/operaciones` · `PATCH /clientes/:id/desactivar` (admin) |
| Divisas | `GET /monedas` · `POST /monedas`, `PATCH /monedas/:id`, `/activar`, `/desactivar` (admin) |
| Tipos de cambio | `GET /tipos-cambio/actual` · `GET /tipos-cambio/historial/:idMoneda` · `POST /tipos-cambio` (admin) |
| Referencia del mercado | `GET /referencia-mercado` · `POST /referencia-mercado/actualizar` (admin) |
| Operaciones | `GET /operaciones` · `GET /operaciones/resumen-dia` · `GET /operaciones/:id` · `POST /operaciones` |
| Caja y cortes | `POST /cortes-caja/abrir` · `GET /cortes-caja/activo` · `GET /cortes-caja/ultimo-cierre` · `POST /cortes-caja/:id/movimientos` · `POST /cortes-caja/:id/cerrar` · `GET /cortes-caja` · `GET /cortes-caja/:id` · `GET /movimientos-caja/corte/:idCorte` |
| Pronóstico de demanda | `GET /pronostico-demanda` |
| Divix AI | `POST /asistente-ia/consultar` · `GET /asistente-ia/conversaciones` · `GET /asistente-ia/conversaciones/:id` · `GET /asistente-ia/historial` · `GET /asistente-ia/historial/todas` (admin) |
| Negocio | `GET /negocio` · `PUT /negocio` (admin) |

### Reglas importantes

- Los importes viajan como **texto** (`"1250.50"`) y se calculan con `decimal.js`, para no perder centavos.
- Todo lo que llega se valida con los DTO; los campos que no están en el DTO se descartan.
- Para registrar una operación el usuario debe tener su **caja abierta** y saldo suficiente: no se puede vender más divisa ni pagar más pesos de los que hay en su caja.
- En USD se lleva el control de **billetes por denominación** (`common/billetes.ts`).

## Variables de entorno

Copia `.env.example` como `.env` y llénalo. Las principales:

| Variable | Para qué |
|---|---|
| `JWT_SECRET` | **Obligatoria.** Clave para firmar las sesiones. |
| `PORT` | Puerto del servidor (3000). |
| `CORS_ORIGIN` | Dirección del frontend (varias separadas por coma). |
| `DB_DRIVER` | `json` (desarrollo) o `mysql`. |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión a MySQL. |
| `SEED_PASSWORD` | Contraseña de `admin` y `cajero1` en la base JSON. |
| `SEED_DEMO` | `false` para no generar las operaciones ficticias de la demo. |
| `IA_PROVEEDOR`, `DEEPSEEK_API_KEY`, `ANTHROPIC_API_KEY` | Divix AI. Sin clave, el asistente avisa que no está configurado. |
| `REFERENCIA_MERCADO`, `BANXICO_TOKEN`, `REFERENCIA_UMBRAL_PCT` | Precio del mercado (Banxico FIX o Banco Central Europeo). |

## Base JSON

Con `DB_DRIVER=json` todo se guarda en `backend/data/`. Si la carpeta está vacía, al arrancar se crean los roles, los usuarios `admin` y `cajero1`, las divisas USD y EUR con un tipo de cambio de ejemplo y, si `SEED_DEMO` no es `false`, dos años de operaciones ficticias. Para empezar de cero basta con borrar la carpeta.

## Comandos

```bash
npm install          # instalar dependencias
npm run start:dev    # servidor con recarga automática
npm run build        # compilar a dist/
npm run start:prod   # correr lo compilado
npm run lint         # revisar el código
npm test             # pruebas unitarias (src/**/*.spec.ts)
npm run test:e2e     # pruebas del flujo completo (test/*.e2e-spec.ts)
```

Las pruebas e2e levantan la app con una base JSON nueva en una carpeta temporal: no tocan `backend/data` ni MySQL y no necesitan `.env`.
