#!/bin/sh
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║ Restaurar backup a una DB Postgres.                                       ║
# ║                                                                           ║
# ║ Uso:                                                                      ║
# ║   ./restore-db.sh <archivo.sql.gz>                                        ║
# ║                                                                           ║
# ║ ⚠ DESTRUCTIVO: el dump fue creado con --clean --if-exists, así que       ║
# ║ va a DROPEAR las tablas existentes antes de re-crearlas. NO correr en    ║
# ║ producción sin estar 100% seguro.                                         ║
# ║                                                                           ║
# ║ Variables: DATABASE_URL (obligatorio).                                    ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

set -e

FILE="$1"

if [ -z "${FILE}" ]; then
    echo "Uso: $0 <archivo.sql.gz>"
    exit 1
fi

if [ ! -f "${FILE}" ]; then
    echo "[restore] FATAL: archivo no existe: ${FILE}"
    exit 1
fi

if [ -z "${DATABASE_URL}" ]; then
    echo "[restore] FATAL: DATABASE_URL no está seteada"
    exit 1
fi

# Confirmación interactiva si no hay --force
if [ "$2" != "--force" ]; then
    echo "⚠ ESTO VA A SOBREESCRIBIR la DB en ${DATABASE_URL}"
    echo "  Backup a restaurar: ${FILE}"
    printf "Confirmar (yes/N): "
    read CONFIRM
    if [ "${CONFIRM}" != "yes" ]; then
        echo "[restore] Abortado por usuario"
        exit 0
    fi
fi

echo "[restore] Restaurando ${FILE} → ${DATABASE_URL}"
START=$(date +%s)

gunzip -c "${FILE}" | psql "${DATABASE_URL}"

DURATION=$(($(date +%s) - START))
echo "[restore] OK (${DURATION}s)"
