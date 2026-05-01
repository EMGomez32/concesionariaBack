#!/bin/sh
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║ Backup automatizado de PostgreSQL.                                        ║
# ║                                                                           ║
# ║ Uso:                                                                      ║
# ║   ./backup-db.sh                                                          ║
# ║                                                                           ║
# ║ Variables de entorno:                                                     ║
# ║   DATABASE_URL          (obligatorio)  postgres://user:pass@host:5432/db  ║
# ║   BACKUP_DIR            (opcional)     default: /backups                  ║
# ║   BACKUP_RETENTION_DAYS (opcional)     default: 30                        ║
# ║                                                                           ║
# ║ Output: $BACKUP_DIR/concesionaria-YYYYMMDD-HHMMSS.sql.gz                  ║
# ║                                                                           ║
# ║ Cron típico (todos los días a las 03:00 AM):                              ║
# ║   0 3 * * * /app/scripts/backup-db.sh                                     ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

set -e

if [ -z "${DATABASE_URL}" ]; then
    echo "[backup] FATAL: DATABASE_URL no está seteada"
    exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
FILE="${BACKUP_DIR}/concesionaria-${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[backup] Iniciando dump → ${FILE}"
START=$(date +%s)

# pg_dump lee DATABASE_URL directamente. Usamos --no-owner / --no-privileges
# para que el dump sea portable a otra DB sin matchear roles exactos.
pg_dump \
    --no-owner \
    --no-privileges \
    --clean --if-exists \
    "${DATABASE_URL}" \
    | gzip -9 > "${FILE}"

# Sanity check: archivo no vacío
SIZE=$(stat -c%s "${FILE}" 2>/dev/null || stat -f%z "${FILE}" 2>/dev/null || echo 0)
if [ "${SIZE}" -lt 1024 ]; then
    echo "[backup] FATAL: backup tiene <1KB (size=${SIZE}), probable error"
    rm -f "${FILE}"
    exit 1
fi

DURATION=$(($(date +%s) - START))
SIZE_MB=$((SIZE / 1024 / 1024))
echo "[backup] OK: ${FILE} (${SIZE_MB} MB, ${DURATION}s)"

# Rotación: borrar dumps más viejos que RETENTION_DAYS
echo "[backup] Limpiando dumps > ${RETENTION_DAYS} días..."
find "${BACKUP_DIR}" -name "concesionaria-*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete -print

# (opcional) sync a S3-compatible si AWS_S3_BUCKET está seteado
if [ -n "${AWS_S3_BUCKET}" ]; then
    if command -v aws >/dev/null 2>&1; then
        echo "[backup] Subiendo a s3://${AWS_S3_BUCKET}/..."
        aws s3 cp "${FILE}" "s3://${AWS_S3_BUCKET}/$(basename ${FILE})"
        echo "[backup] Upload OK"
    else
        echo "[backup] WARN: AWS_S3_BUCKET seteado pero aws CLI no instalado, skipping upload"
    fi
fi

echo "[backup] Done."
