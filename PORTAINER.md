# Despliegue en Portainer

Guía completa para desplegar el stack (PostgreSQL + Backend + Frontend) en una instancia de [Portainer](https://www.portainer.io/).

A diferencia de Coolify, **Portainer no incluye reverse proxy ni SSL automático** — necesitás Traefik o Nginx Proxy Manager corriendo en otro stack para HTTPS y dominios. Esta guía cubre las dos alternativas más comunes.

---

## Requisitos previos

- Una instancia de Portainer corriendo (Community o Business Edition).
- Acceso al "Environment" donde vas a deployar (local Docker o un endpoint remoto).
- Un dominio (o subdominios) con DNS apuntando al servidor donde corre Portainer.
- Reverse proxy ya instalado (ver sección 5 si todavía no tenés).

---

## 1. Decidir los dominios

Lo más limpio es tener dos subdominios:

| Subdominio | Apunta a | Para qué sirve |
|---|---|---|
| `app.tudominio.com` | Frontend (nginx en el container `front`) | UI que ven los usuarios |
| `api.tudominio.com` | Backend (Node en el container `back`) | API REST |

Configurá los DNS A/AAAA de ambos al IP público del servidor de Portainer. Si todavía no tenés certificados, tu reverse proxy se los va a generar automáticamente con Let's Encrypt.

---

## 2. Crear el Stack en Portainer

1. En el menú lateral de Portainer → **Stacks** → **+ Add stack**.
2. **Name**: `concesionaria` (o el que prefieras — define el prefijo de los containers y volúmenes).
3. **Build method**: elegí **Web editor**.
4. Pegá el contenido de [`docker-compose.portainer.yml`](./docker-compose.portainer.yml) tal cual.

> 💡 Alternativa: podés usar **Repository** apuntando a este repo de GitHub (rama `main`, path `docker-compose.portainer.yml`) — Portainer va a redeployar automáticamente cuando hagas push si activás "GitOps updates".

---

## 3. Setear las variables de entorno

En la misma pantalla, scrolleá hasta **Environment variables** y agregá una por una:

### Obligatorias

| Variable | Cómo generarla / valor |
|---|---|
| `POSTGRES_PASSWORD` | `openssl rand -base64 32` (passwd fuerte) |
| `JWT_SECRET` | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | `openssl rand -base64 48` (distinto del anterior) |
| `APP_BASE_URL` | `https://app.tudominio.com` (URL del front, sin `/` final) |
| `CORS_ALLOWED_ORIGINS` | `https://app.tudominio.com` (mismo valor; varias separadas por coma) |
| `VITE_API_BASE_URL` | `https://api.tudominio.com/api` (URL del back **con** `/api`) |
| `BACKEND_ORIGIN` | `https://api.tudominio.com` (URL del back **sin** path) |
| `BOOTSTRAP_SUPER_PASSWORD` | password fuerte para `soporteautenza@gmail.com` |

### Opcionales — Bootstrap

| Variable | Default | Descripción |
|---|---|---|
| `BOOTSTRAP_SUPER_EMAIL` | `soporteautenza@gmail.com` | Email del super_admin |
| `BOOTSTRAP_SUPER_NAME` | `Soporte AUTENZA` | Nombre que aparece en panel |

### Opcionales — SMTP (para que funcionen activación + reset password)

| Variable | Ejemplo Brevo | Ejemplo Resend |
|---|---|---|
| `SMTP_HOST` | `smtp-relay.brevo.com` | `smtp.resend.com` |
| `SMTP_PORT` | `587` | `465` |
| `SMTP_USER` | tu login SMTP de Brevo | `resend` |
| `SMTP_PASS` | tu SMTP key de Brevo | tu API key `re_...` |
| `SMTP_FROM` | `Soporte AUTENZA <no-reply@tudominio.com>` | igual |

> ⚠ Si dejás SMTP vacío, el sistema usa `ConsoleTransport` y los emails van al log del container — útil para desarrollo, NO para prod.

### Marcar como secrets

Tocá el ícono de candado a la derecha de las siguientes variables para que Portainer las trate como secret y no las muestre en logs/UI:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `BOOTSTRAP_SUPER_PASSWORD`
- `SMTP_PASS`

---

## 4. Deploy del stack

1. Click en **Deploy the stack** (abajo).
2. Portainer va a clonar los repos de GitHub, buildear las imágenes y arrancar los 3 containers. **Tarda 3-8 minutos en el primer deploy** (npm install + build TS + Vite build).
3. Cuando termine, los 3 servicios deberían aparecer en estado `running` y `healthy`:
   - `concesionaria_db_1` → healthy en ~10 seg
   - `concesionaria_back_1` → healthy en ~30 seg (después de db, prisma db push, init-rls, bootstrap)
   - `concesionaria_front_1` → healthy en ~10 seg
4. **Verificá los logs del back** (click en el container → Logs):
   ```
   [bootstrap] roles: 6/6
   [bootstrap] planes: 1
   [bootstrap] super_admin creado: soporteautenza@gmail.com
   [bootstrap] done.
   info: 🚀 Concesionaria SaaS API running on port 3000
   ```

Si no ves esos logs en 5 minutos, algo falló — revisá la sección [Troubleshooting](#troubleshooting).

---

## 5. Reverse proxy + HTTPS

### Opción A — Traefik (recomendado, todo via labels)

Si tenés [Traefik](https://traefik.io/) corriendo (con su propio stack en Portainer), agregá estos labels al servicio `back` y `front` del compose:

```yaml
    back:
        # ... resto igual ...
        labels:
            - "traefik.enable=true"
            - "traefik.http.routers.concesionaria-api.rule=Host(`api.tudominio.com`)"
            - "traefik.http.routers.concesionaria-api.entrypoints=websecure"
            - "traefik.http.routers.concesionaria-api.tls.certresolver=letsencrypt"
            - "traefik.http.services.concesionaria-api.loadbalancer.server.port=3000"
        networks:
            - concesionaria-net
            - traefik-net   # ← red de Traefik (debe existir)

    front:
        # ... resto igual ...
        labels:
            - "traefik.enable=true"
            - "traefik.http.routers.concesionaria-app.rule=Host(`app.tudominio.com`)"
            - "traefik.http.routers.concesionaria-app.entrypoints=websecure"
            - "traefik.http.routers.concesionaria-app.tls.certresolver=letsencrypt"
            - "traefik.http.services.concesionaria-app.loadbalancer.server.port=80"
        networks:
            - concesionaria-net
            - traefik-net

networks:
    concesionaria-net:
        driver: bridge
    traefik-net:
        external: true
```

Asegurate de que tu Traefik esté configurado con `certresolver=letsencrypt` y la red `traefik-net` exista (`docker network create traefik-net`).

### Opción B — Nginx Proxy Manager (más visual)

Si preferís UI antes que labels, instalá [Nginx Proxy Manager](https://nginxproxymanager.com/) como otro stack en Portainer. Después:

1. Conectate al panel de NPM (`http://servidor:81`).
2. **Proxy Hosts → Add Proxy Host**:
   - **Domain Names**: `api.tudominio.com`
   - **Forward Hostname**: `concesionaria_back_1` (o el nombre exacto del container)
   - **Forward Port**: `3000`
   - **Block Common Exploits**: ✅
   - **Websockets Support**: ✅
   - Tab **SSL**: pedile certificado Let's Encrypt → Save
3. Repetir con `app.tudominio.com` → `concesionaria_front_1` → `80`.

Para que NPM "vea" los containers del stack, ambos stacks tienen que estar conectados a la misma red Docker. Lo más simple: agregá `external: true` a la red y creala manualmente:

```bash
docker network create proxy-net
```

Y conectá los servicios del stack de concesionaria a esa red.

---

## 6. Persistencia de datos

El stack usa dos volúmenes Docker:

| Volumen | Path en container | Contenido |
|---|---|---|
| `concesionaria_db_data` | `/var/lib/postgresql/data` | Base de datos completa |
| `concesionaria_back_uploads` | `/app/uploads` | Imágenes de vehículos, comprobantes, archivos subidos |

**Backup recomendado**: cada noche, exportar los volúmenes a un bucket S3/Backblaze. Mínimo lo crítico (`db_data`).

```bash
# Backup manual de la DB
docker exec concesionaria_db_1 pg_dump -U concesionaria concesionaria \
    > backup-$(date +%Y%m%d).sql
```

---

## 7. Updates

### Cuando pusheás a GitHub

Si configuraste el stack via **Repository** mode con "GitOps updates" habilitado:

- Portainer detecta el push, rebuild las imágenes y reinicia los containers automáticamente (cada N minutos según config).

Si lo hiciste via **Web editor**:

1. Volvé al Stack en Portainer → **Editor**.
2. Click **Update the stack**.
3. Marcar ✅ **Re-pull image** (para back y front, así rebuild desde el último commit).
4. **Update**.

### Migraciones de DB

El backend hace `prisma db push --accept-data-loss` en cada arranque (en el `CMD` del Dockerfile). Es seguro porque Prisma sincroniza schema sin perder datos en cambios aditivos. **Para cambios destructivos** (renombrar columnas, cambiar tipos), hacelo manualmente con SQL antes del redeploy.

---

## 8. Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| `back` reinicia en loop con `Cannot connect to db` | Postgres todavía no terminó de inicializar | Esperar 30 seg al primer arranque; el `depends_on: condition: service_healthy` ya lo cubre |
| `back` log: `JWT secret too short` | `JWT_SECRET` mal seteado o vacío | Verificar variables del stack; mínimo 32 chars |
| Front carga pero login devuelve 404 | `VITE_API_BASE_URL` falta `/api` al final | Editar variable, marcar "Re-pull image" y Update stack |
| `CORS error` al loguear | `CORS_ALLOWED_ORIGINS` no coincide con la URL del front | Setear exactamente igual a `APP_BASE_URL`, sin `/` final |
| Emails no llegan | SMTP no configurado | Setear las 5 vars `SMTP_*`; ver COOLIFY.md sección de SMTP |
| Build del front falla con `Cannot find module 'vite'` | NODE_ENV=production en build de Vite | Ya está cubierto en el Dockerfile con `--include=dev`; si persiste, mirar logs de build en Portainer |
| Container `front` healthy pero página 502 | Reverse proxy apuntando al puerto/hostname incorrecto | Verificar Forward Hostname/Port en NPM o labels Traefik |
| `db` log: `out of shared memory` | `max_connections` insuficiente | Subido a 200 en el compose; si necesitás más, editar el `command` del servicio |

### Ver logs en vivo

Portainer → Container → Logs → marcar **Auto-refresh** y **Wrap lines**.

### Reset completo (⚠ borra TODO)

```bash
# Desde la terminal del host de Docker
docker compose -f docker-compose.portainer.yml down -v
```

O desde Portainer: Stack → Stop → Delete (chequear "Remove non-persistent volumes").

---

## 9. Diferencias vs Coolify

| Tema | Coolify | Portainer |
|---|---|---|
| Reverse proxy | Incluye Traefik integrado | Necesitás instalar Traefik o NPM aparte |
| SSL automático | ✅ checkbox | Via Traefik/NPM |
| Build desde Git | ✅ nativo | ✅ nativo (compose v2 soporta `build: <git-url>`) |
| GitOps | Webhook nativo | Polling cada N minutos (Stack Repository mode) |
| Logs centralizados | ✅ panel propio | ✅ panel propio |
| Backups | Plugin / manual | Manual (scripts cron) |
| Variables de entorno | UI por app | UI por stack |
| Healthcheck | Auto | Auto (definido en Dockerfile) |

---

## 10. Resumen

- 1 stack en Portainer = 3 containers (db, back, front) + 2 volúmenes
- Reverse proxy/SSL en otro stack (Traefik o NPM)
- Build desde GitHub en cada redeploy — sin necesidad de registry
- Bootstrap idempotente crea roles + Plan Free + super_admin en cada arranque
- Healthcheck cada 30 seg con auto-restart en fallos

Listo para producción.
