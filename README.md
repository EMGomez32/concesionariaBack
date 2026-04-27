# Concesionaria — Backend

Sistema multi-tenant de gestión de concesionarias. SaaS donde múltiples concesionarias-clientes (tenants) operan stock, ventas, presupuestos, financiación, postventa y caja desde una sola instalación con datos aislados por concesionaria via Row-Level Security en Postgres.

## Stack

- **Node.js 22** + **Express** + **TypeScript** estricto
- **Prisma 7** (con `@prisma/adapter-pg` para PostgreSQL)
- **bcrypt** nativo para hashing
- **jsonwebtoken** (access + refresh) con rotación
- **express-validator** + **winston** + **express-rate-limit** + **helmet**
- **PM2** en cluster mode (1 worker por core)

## Capacidades

| Módulo | Resumen |
|---|---|
| Auth | Login, refresh tokens rotados, flujo de invitación + activación por email, recuperación de password |
| Tenants | CRUD de concesionarias (super_admin), aislamiento RLS por `concesionaria_id` |
| Usuarios y roles | 6 roles (super_admin, admin, vendedor, cobrador, postventa, lectura) — guards en route + use-case |
| Catálogo | Marcas → Modelos → Versiones (con precio sugerido y año) por tenant |
| Stock | Vehículos, ingresos por modalidad, movimientos inter-sucursales, reservas |
| Operaciones | Clientes, presupuestos, ventas, financiación interna y solicitudes externas |
| Gastos | Por unidad y fijos operativos, categorizables |
| Postventa | Casos con ítems de trabajo |
| Caja | Movimientos individuales + cierres diarios con saldo teórico vs real |
| Auditoría | Log automático de operaciones críticas, exportable a CSV |
| Billing | Planes, suscripciones por tenant, facturas, registro de pagos |

## Desarrollo

```bash
npm install
cp .env.example .env
# Editar .env con tu DATABASE_URL y JWT secrets

# Sincronizar schema (en lugar de migrate)
npx prisma db push
npx ts-node prisma/init-rls.ts

# (Opcional) seed de demo — crea admin@demo.com / superadmin@demo.com
SEED_ADMIN_PASSWORD=admin123 SEED_SUPER_PASSWORD=super123 npm run seed

# Servidor con hot-reload
npm run dev
```

API en `http://localhost:3000`. Docs Swagger en `http://localhost:3000/api-docs`.

## Variables de entorno

Ver [`.env.example`](./.env.example) para la lista completa.

Imprescindibles:

- `DATABASE_URL` — Postgres connection string (`postgresql://user:pass@host:5432/db`)
- `JWT_SECRET` — secret de 32+ chars (`openssl rand -base64 48`)
- `JWT_REFRESH_SECRET` — otro secret distinto
- `CORS_ALLOWED_ORIGINS` — URLs del frontend separadas por coma
- `APP_BASE_URL` — URL pública del frontend, usada en los links de email

## Despliegue

Para deploy en Coolify ver [COOLIFY.md](./COOLIFY.md).

El Dockerfile es multi-stage, no-root user, healthcheck en `/health`, y por default arranca con PM2 cluster (`-i max`) con `prisma db push` previo.

```bash
# Build local
docker build -t concesionaria-back .
docker run --rm -p 3000:3000 \
    -e DATABASE_URL=... \
    -e JWT_SECRET=... \
    -e JWT_REFRESH_SECRET=... \
    concesionaria-back
```

## Tests

```bash
npm test                    # jest --runInBand (incluye integration con DB real)
```

Los tests de integración requieren un Postgres corriendo y aplican `prisma db push` automáticamente.

## Comandos Prisma útiles

| Comando | Uso |
|---|---|
| `npx prisma db push` | Sincroniza schema con la DB (no genera migraciones) |
| `npx prisma generate` | Regenera el cliente TS |
| `npx prisma studio` | UI para inspeccionar/editar datos en `localhost:5555` |

## Performance

Probado con [k6](https://k6.io) hasta 500 VUs (test de carga). Capacidad medida:

| Carga | p95 reads | p95 writes | Error rate |
|---|---|---|---|
| 5 VUs | 42 ms | 85 ms | 0% |
| 500 VUs | 371 ms | 280 ms | <1% (con DB tuneada) |

Documentación completa del test en `loadtest/REPORT.md` (en el monorepo de desarrollo, no en este repo).

## Licencia

Privado.
