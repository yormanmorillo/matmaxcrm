#!/usr/bin/env bash
# MATMAX CRM — backup diario de base de datos, datos y configuración.
# Uso: ./backup.sh
set -euo pipefail
umask 077

BASE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BASE}/backups"
STAMP="$(date +%Y-%m-%d_%H%M)"
DAILY="${BACKUP_DIR}/daily/${STAMP}"
PROJECT="matmax-crm"
LOG_PREFIX="[$(date -Is)]"

log() { printf '%s %s\n' "$LOG_PREFIX" "$*"; }
fail() { printf '%s ERROR: %s\n' "$LOG_PREFIX" "$*" >&2; exit 1; }

# Evita dos ejecuciones simultáneas
exec 9>/var/lock/matmax-backup.lock
flock -n 9 || { log "Ya hay un backup en curso"; exit 0; }

[ -f "${BASE}/.env" ] || fail "No existe ${BASE}/.env"
# shellcheck disable=SC1091
set -a; . "${BASE}/.env"; set +a
: "${DB_NAME:?DB_NAME no definido}"
: "${DB_ROOT_PASSWORD:?DB_ROOT_PASSWORD no definido}"

mkdir -p "${DAILY}" "${BACKUP_DIR}/weekly" "${BACKUP_DIR}/monthly"
chmod 700 "${BACKUP_DIR}"

log "Iniciando backup ${STAMP}"

# 1. Base de datos (dump consistente, rutinas, triggers y eventos)
docker exec -e MYSQL_PWD="${DB_ROOT_PASSWORD}" matmax-db \
  mariadb-dump -uroot --single-transaction --quick --routines --triggers --events \
  --default-character-set=utf8mb4 "${DB_NAME}" \
  | gzip -9 > "${DAILY}/db.sql.gz"
gzip -t "${DAILY}/db.sql.gz" || fail "dump de base de datos corrupto"
log "Base de datos: $(du -h "${DAILY}/db.sql.gz" | cut -f1)"

# 2. Volúmenes de datos (adjuntos, configuración, customizaciones)
docker run --rm --volumes-from matmax-app \
  -v "${DAILY}":/backup:rw alpine:3.20 sh -c '
    set -e
    tar czf /backup/espocrm-data.tar.gz -C /var/www/html/data .
    tar czf /backup/espocrm-custom.tar.gz -C /var/www/html/custom .
    tar czf /backup/espocrm-custom-client.tar.gz -C /var/www/html/client/custom .
  '
for archive in espocrm-data espocrm-custom espocrm-custom-client; do
  tar tzf "${DAILY}/${archive}.tar.gz" >/dev/null || fail "archivo ${archive} corrupto"
done
log "Volúmenes: $(du -sh "${DAILY}" | cut -f1)"

# 3. Configuración e infraestructura
cp -a "${BASE}/.env" "${DAILY}/env.backup"
cp -a "${BASE}/docker-compose.yml" "${DAILY}/docker-compose.yml"
cp -a "${BASE}/nginx" "${DAILY}/nginx"
cp -a "${BASE}/php" "${DAILY}/php"
cp -a "${BASE}/scripts" "${DAILY}/scripts"
chmod 600 "${DAILY}/env.backup"

# 4. Integridad
( cd "${DAILY}" && find . -maxdepth 1 -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS )

# 5. Retención: 7 diarios, 4 semanales, 3 mensuales
if [ "$(date +%u)" = "7" ]; then
  cp -al "${DAILY}" "${BACKUP_DIR}/weekly/${STAMP}"
  mapfile -t weeklies < <(ls -1d "${BACKUP_DIR}/weekly"/*/ 2>/dev/null | sort)
  if [ "${#weeklies[@]}" -gt 4 ]; then
    printf '%s\n' "${weeklies[@]:0:${#weeklies[@]}-4}" | xargs -r rm -rf
  fi
  log "Copia semanal creada"
fi
if [ "$(date +%d)" = "01" ]; then
  cp -al "${DAILY}" "${BACKUP_DIR}/monthly/${STAMP}"
  mapfile -t monthlies < <(ls -1d "${BACKUP_DIR}/monthly"/*/ 2>/dev/null | sort)
  if [ "${#monthlies[@]}" -gt 3 ]; then
    printf '%s\n' "${monthlies[@]:0:${#monthlies[@]}-3}" | xargs -r rm -rf
  fi
  log "Copia mensual creada"
fi

find "${BACKUP_DIR}/daily" -mindepth 1 -maxdepth 1 -type d -mtime +7 -exec rm -rf {} +
log "Backup completado: ${DAILY}"
