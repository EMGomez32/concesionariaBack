# Estrategia de backups

Backups automatizados de PostgreSQL para AUTENZA. Sin esto, un fallo de DB = pérdida total de datos. Mínimo viable para producción.

## Quick start (Coolify)

Coolify Community **NO incluye** backups automáticos para servicios PostgreSQL como sí los hace Coolify Pro. Las opciones son:

### Opción A — Sidecar service de cron (recomendada)

Agregar al stack/proyecto un servicio dedicado que corre `backup-db.sh` por cron.

**Compose snippet** (agregar a tu `docker-compose.yml` o crear un stack aparte):

```yaml
services:
  db-backup:
    image: postgres:16-alpine
    restart: unless-stopped
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      BACKUP_DIR: /backups
      BACKUP_RETENTION_DAYS: 30
      # Opcional: para subir a S3-compatible (Backblaze B2 free tier 10GB):
      # AWS_S3_BUCKET: tu-bucket
      # AWS_ACCESS_KEY_ID: ...
      # AWS_SECRET_ACCESS_KEY: ...
      # AWS_DEFAULT_REGION: us-east-005
      # AWS_ENDPOINT_URL: https://s3.us-east-005.backblazeb2.com
    volumes:
      - ./scripts/backup-db.sh:/usr/local/bin/backup-db.sh:ro
      - db_backups:/backups
    entrypoint:
      - /bin/sh
      - -c
      - |
        # Instalar AWS CLI si AWS_S3_BUCKET está definido
        if [ -n "$$AWS_S3_BUCKET" ]; then
          apk add --no-cache aws-cli > /dev/null
        fi
        # Cron simple: corre backup todos los días a las 03:00 UTC.
        echo "0 3 * * * /usr/local/bin/backup-db.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root
        crond -f -L /var/log/backup.log

volumes:
  db_backups:
    driver: local
```

### Opción B — Cron en el host

Si tenés acceso al host de Docker (no a Portainer Cloud), agregar a `crontab -e`:

```cron
# Backup diario AUTENZA a las 03:00
0 3 * * * docker exec -t concesionaria_db_1 pg_dump -U concesionaria concesionaria --no-owner --no-privileges --clean --if-exists | gzip > /opt/backups/concesionaria-$(date +\%Y\%m\%d).sql.gz
```

### Opción C — Servicio externo

- **pgBackRest** (más robusto, soporta retention policies finas)
- **Restic** (backup encriptado a S3/Backblaze/Wasabi)
- **Coolify Pro** ($5/mes) trae backups gestionados

---

## Test del backup

**Importante**: un backup que nunca probaste NO es un backup. Cada 1-3 meses hacer un test de restore en una DB temporal:

```bash
# Tomar el último backup
LAST=$(ls -t /backups/concesionaria-*.sql.gz | head -1)

# Crear DB temporal en la misma instancia
docker exec -t concesionaria_db_1 createdb -U postgres concesionaria_test

# Restore
DATABASE_URL=postgresql://postgres:pass@localhost:5432/concesionaria_test \
  ./scripts/restore-db.sh "$LAST" --force

# Verificar contar filas
docker exec -t concesionaria_db_1 psql -U postgres concesionaria_test \
  -c "SELECT COUNT(*) FROM vehiculos; SELECT COUNT(*) FROM ventas;"

# Limpiar
docker exec -t concesionaria_db_1 dropdb -U postgres concesionaria_test
```

Si los counts coinciden con producción, el backup es restaurable.

---

## Retention sugerida

Por default `BACKUP_RETENTION_DAYS=30` borra dumps > 30 días.

Para producción seria, **3-2-1 rule**:
- **3 copias** de la data (live DB + 2 backups)
- **2 medios** distintos (disco local + S3/Backblaze)
- **1 offsite** (no en el mismo data center que la DB)

Configuración recomendada:

| Retention | Dónde |
|---|---|
| Daily, 30 días | Disco local del servidor (`/backups/`) |
| Weekly, 12 semanas | Backblaze B2 free tier |
| Monthly, 12 meses | Backblaze B2 (paid o glacial) |

---

## Restore en disaster recovery

Si la DB se rompe / se pierde:

```bash
# 1. Spinear DB nueva limpia (ej: docker compose up -d db)
# 2. Bajar el último backup de S3:
aws s3 cp s3://tu-bucket/concesionaria-20260101-030000.sql.gz /tmp/

# 3. Restaurar:
DATABASE_URL=postgresql://... ./scripts/restore-db.sh /tmp/concesionaria-20260101-030000.sql.gz

# 4. Re-ejecutar init-rls (las policies no se backupean por default):
npm run init-rls
```

**RTO** (tiempo de recuperación) estimado: **15-30 min** dependiendo del tamaño de la DB y la velocidad de descarga.

---

## Lo que NO está backupeado

- **Uploads** (`/app/uploads/`): imágenes y documentos subidos. Backupear el volumen `back_uploads` por separado (ej: `tar -czf uploads-$(date).tar.gz /app/uploads/` o sync a S3).
- **Logs**: están en stdout del container; si necesitás retention, configurar Loki/Datadog o `docker logs --tail` periódico.
- **Configuración de Coolify/Portainer**: env vars, dominios, etc. Exportar manualmente cada N tiempo.

---

## Monitoreo

Recomendado: agregar un check de Sentry o Healthchecks.io que se "pinguee" desde el cron del backup. Si pasa más de 25h sin ping, recibís alerta:

```sh
# En el cron, después del backup:
curl -fsS -m 10 --retry 3 https://hc-ping.com/<tu-uuid>/success
```
