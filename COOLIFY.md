# Despliegue en Coolify

Guía paso a paso para desplegar el backend de Concesionaria en una instancia de [Coolify](https://coolify.io).

---

## 1. Preparar el servicio de base de datos

En el panel de Coolify, antes de crear la app:

1. **+ New** → **Database** → **PostgreSQL 16**.
2. Asignarle nombre (`concesionaria-db`) y un proyecto.
3. Anotar el `Internal connection URL` (algo como `postgres://USER:PASS@HOSTNAME:5432/DBNAME`). Lo vas a necesitar como `DATABASE_URL`.
4. (Opcional) Subir `max_connections` si vas a tener varias instancias del backend con PM2 cluster: en el panel de la DB → "Advanced" → custom postgres args:
   ```
   -c max_connections=200
   ```

---

## 2. Crear la app del backend

1. **+ New** → **Application** → **Public Repository** (o GitHub si conectaste tu cuenta).
2. URL del repo: `https://github.com/EMGomez32/concesionariaBack`.
3. Branch: `main`.
4. **Build pack**: Dockerfile.
5. **Dockerfile location**: `Dockerfile` (raíz).
6. **Port**: `3000`.

---

## 3. Variables de entorno

En la pestaña **Environment Variables** de la app, configurar:

| Variable | Valor sugerido | Descripción |
|---|---|---|
| `NODE_ENV` | `production` | Activa modo prod (logs warn+, sin debug). |
| `PORT` | `3000` | Puerto interno. Debe coincidir con `EXPOSE`. |
| `DATABASE_URL` | `postgresql://...` | Internal URL de la DB Coolify (paso 1). |
| `DB_POOL_MAX` | `5` | Conexiones por worker PM2. Total = N × 5. |
| `JWT_SECRET` | (generar) | `openssl rand -base64 48` — secret de 48+ chars. |
| `JWT_REFRESH_SECRET` | (generar) | Otro secret distinto, mismo método. |
| `JWT_EXPIRES_IN` | `15m` | Vida del access token. |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Vida del refresh token. |
| `CORS_ALLOWED_ORIGINS` | `https://app.tudominio.com` | URL del frontend (sin `/` final, separar por coma si hay varias). |
| `APP_BASE_URL` | `https://app.tudominio.com` | URL pública del frontend (para los links de activación / reset por email). |
| `LOG_LEVEL` | `info` | Nivel de winston. `debug` para troubleshooting. |
| `UPLOADS_DIR` | `/app/uploads` | Path interno de los archivos subidos. |

**Para emails (cuando tengas SMTP configurado)**:

| Variable | Ejemplo |
|---|---|
| `SMTP_HOST` | `smtp.resend.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | (de tu proveedor) |
| `SMTP_PASS` | (mark as **Secret** en Coolify) |
| `SMTP_FROM` | `no-reply@tudominio.com` |

> ⚠ Marcar `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`, `SMTP_PASS` como **Is Secret** en Coolify para que no se vean en logs/UI.

---

## 4. Volúmenes

En **Storages**:

- **Mount**: `/app/uploads` → volumen persistente. Esto preserva las imágenes y documentos subidos al hacer redeploy.

Sin esto, cada redeploy borra los uploads.

---

## 5. Healthcheck

Coolify usa el `HEALTHCHECK` del Dockerfile automáticamente. Verifica que el endpoint `/health` responda 200. Si falla 3 veces seguidas, Coolify reinicia el container.

---

## 6. Custom Start Command (opcional, recomendado en producción)

Por default el Dockerfile corre:

```sh
npx prisma db push --accept-data-loss && npx ts-node prisma/init-rls.ts && npm run start:cluster
```

Esto está bien para **una sola instancia**. Si vas a escalar a 2+ réplicas:

1. Hacer el primer deploy con el comando default (para crear schema + RLS).
2. Después cambiar el **Custom Start Command** a:
   ```sh
   npm run start:cluster
   ```
   Y correr migraciones manualmente desde un terminal de Coolify cuando haya cambios de schema.

---

## 7. Dominio y SSL

En **Domains**:
- Apuntar tu dominio (ej: `api.tudominio.com`) al subdominio que te da Coolify.
- Activar **HTTPS automatic** (Let's Encrypt).
- En el frontend, configurar `VITE_API_BASE_URL=https://api.tudominio.com/api` como build arg.

---

## 8. Primer arranque y seed

El arranque ejecuta `prisma db push` que crea el schema. Después podés:

**Opción A — usar el seed de demo** (no recomendado en prod):
1. En Coolify → Terminal de la app → `npm run seed`.
2. Esto crea `admin@demo.com` y `superadmin@demo.com` con passwords de las env vars `SEED_ADMIN_PASSWORD` / `SEED_SUPER_PASSWORD`.

**Opción B — crear el primer super_admin manualmente** (recomendado):

```sh
# En el terminal de Coolify, dentro de la app:
node -e "
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
    const hash = await bcrypt.hash('TU_PASSWORD_FUERTE', 10);
    await pool.query(\"INSERT INTO roles (nombre) VALUES ('super_admin') ON CONFLICT DO NOTHING\");
    const r = await pool.query(\"SELECT id FROM roles WHERE nombre='super_admin'\");
    const u = await pool.query(\"INSERT INTO usuarios (nombre, email, password_hash, email_verificado, estado, activo, created_at, updated_at) VALUES ('Super Admin', 'TU_EMAIL@dominio.com', \$1, true, 'activo', true, NOW(), NOW()) RETURNING id\", [hash]);
    await pool.query('INSERT INTO usuario_roles (usuario_id, rol_id, created_at, updated_at) VALUES (\$1, \$2, NOW(), NOW())', [u.rows[0].id, r.rows[0].id]);
    console.log('Super admin creado:', u.rows[0].id);
    await pool.end();
})();
"
```

Reemplazar `TU_PASSWORD_FUERTE` y `TU_EMAIL@dominio.com`.

---

## 9. Logs

- **Live logs**: pestaña Logs de Coolify.
- Para ver los emails que `ConsoleTransport` imprime (cuando todavía no configuraste SMTP), buscar lo que matchea `EMAIL OUT`.
- PM2 levanta N workers (uno por core); cada uno mensajea de forma independiente.

---

## 10. Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| `503 unhealthy` al arrancar | `DATABASE_URL` mal configurada | Verificar internal URL de la DB. Coolify dashboard → DB → Connection. |
| `Too many database connections` | `DB_POOL_MAX × workers` excede `max_connections` de Postgres | Bajar `DB_POOL_MAX` o subir `max_connections` (paso 1). |
| `JWT secret too short` al arrancar | `JWT_SECRET` con menos de 10 chars | Generar con `openssl rand -base64 48`. |
| Login devuelve `Tu cuenta todavía no está activada` | Usuario migrado de versión vieja sin flag `email_verificado` | Conectarse a la DB y `UPDATE usuarios SET email_verificado=true, estado='activo' WHERE password_hash IS NOT NULL`. |
| Los emails no llegan | `ConsoleTransport` está activo | Configurar `SMTP_HOST` y derivados. La app usa SMTP automáticamente cuando esa env var existe. |

---

## 11. Resumen

- Backend público en `https://api.tudominio.com`
- DB privada, accesible solo desde la app via internal network de Coolify
- Auto-deploy con webhook al push a `main` (configurable en Coolify)
- Healthcheck cada 30s, restart automático en caso de fallo
- Logs centralizados, persistencia de uploads en volumen separado
