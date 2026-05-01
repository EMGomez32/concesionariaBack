# Arquitectura — AUTENZA Backend

## Stack
- **Runtime**: Node.js 22 + TypeScript estricto
- **Framework**: Express 5
- **ORM**: Prisma 7 con `@prisma/adapter-pg` (PostgreSQL nativo, sin Prisma Engine)
- **Auth**: JWT (access + refresh con rotación), bcrypt nativo
- **Multi-tenant**: Postgres RLS (`app.tenant_id` + `app.is_super_admin`)
- **Cluster**: PM2 (`-i max`, 1 worker por core)
- **Logging**: winston con redactor de secrets + correlationId/tenantId/userId del AsyncLocalStorage
- **Métricas**: prom-client (`/metrics`)
- **Errores**: Sentry (opcional, activado por `SENTRY_DSN`)
- **Email**: nodemailer + outbox pattern (worker async con retries exponenciales)

## Capas

```
┌─────────────────────────────────────────────────┐
│           HTTP (Express routes)                 │
│  src/routes/index.ts → /api/* routers           │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────▼──────────┬──────────────────┐
        │  modules/<dom>/    │  interface/      │  ← capa de transporte
        │  (funcional)       │  (clean lite)    │
        └─────────┬──────────┴────────┬─────────┘
                  │                   │
                  ▼                   ▼
            ┌─────────────────────────────┐
            │      Servicios / use-cases  │  ← lógica de negocio
            └─────────────┬───────────────┘
                          │
                          ▼
            ┌─────────────────────────────┐
            │  Prisma extension           │  ← injection de tenant + RLS
            │  (prisma.extension.ts)      │     + soft-delete intercept
            └─────────────┬───────────────┘
                          │
                          ▼
                ┌─────────────────────┐
                │  Postgres + RLS     │
                │  app.tenant_id      │
                └─────────────────────┘
```

> ⚠ **Deuda técnica conocida**: hay DOS patrones conviviendo: `modules/`
> (más nuevo, funcional) y `interface/ + application/use-cases/` (clean
> architecture lite). Ver [ROADMAP.md](./ROADMAP.md) Sprint 4 para el plan
> de unificación.

## Multi-tenancy

Cada request resuelve un `AppContext` con `userId`, `concesionariaId`, `roles`,
`correlationId` que se guarda en `AsyncLocalStorage`. La extensión de Prisma
(`infrastructure/database/prisma.extension.ts`) inyecta `concesionariaId`
automáticamente en `where` y `data` de todas las operaciones — y abre una
transacción que setea `SELECT set_config('app.tenant_id', $1, true)` para
que las RLS policies del schema vean el tenant correcto.

**Excepción**: `$queryRaw` y `$executeRaw` NO pasan por la extensión.
Cualquier endpoint que use raw SQL (analytics, caja saldo) debe inyectar
`AND concesionaria_id = $1` a mano. Si lo olvidás → leak cross-tenant.

## Soft-delete

Los modelos en `SOFT_DELETE_MODELS` (definido en `prisma.extension.ts`)
interceptan `delete`/`deleteMany` y los reescriben como `update` de
`deletedAt`. Las lecturas también filtran `deletedAt: null` automáticamente.

Modelos NO en la lista (Rol, Plan, RefreshToken, AccountToken, EmailOutbox,
Invoice, Payment) hacen hard-delete.

## Email outbox pattern

`getEmailTransport().send()` NO manda SMTP directo — persiste en
`email_outbox` table. Un worker async (`startOutboxWorker`, solo en el
worker 0 del cluster) drainea pendientes con backoff exponencial:
1m → 5m → 15m → 1h → 4h → 24h. Hasta 6 intentos por email.

Beneficios: HTTP rápido, emails no se pierden si SMTP cae, idempotencia.

## Health checks

- `GET /livez` — barato, solo verifica que el proceso responda
- `GET /readyz` — verifica DB con `SELECT 1`
- `GET /health` — alias legacy de `/readyz` (compat con Coolify)

## Métricas Prometheus

`GET /metrics` expone:
- `http_requests_total{method, route, status}`
- `http_request_duration_seconds{method, route, status}` (histograma)
- `http_requests_inflight`
- Default metrics (CPU, memoria, event loop lag, GC)

En producción gatear con IP allowlist o header secret en el reverse proxy.

## Graceful shutdown

`SIGTERM`/`SIGINT` triggea:
1. `server.close()` (deja de aceptar conexiones nuevas)
2. Espera requests in-flight
3. Detiene outbox worker
4. `prisma.$disconnect()`
5. `exit(0)` con timeout duro de 25s (5s margen vs los 30s de Docker)

## Variables de entorno críticas

Ver `.env.example`. Las imprescindibles:
- `DATABASE_URL`
- `JWT_SECRET` / `JWT_REFRESH_SECRET` (ambos min 32 chars)
- `CORS_ALLOWED_ORIGINS`
- `APP_BASE_URL`

Opcionales:
- `SMTP_*` para emails reales (sin esto, ConsoleTransport)
- `SENTRY_DSN` para error tracking
- `BOOTSTRAP_SUPER_PASSWORD` para crear super_admin automático
