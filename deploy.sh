#!/usr/bin/env bash
# Despliegue de MATMAX CRM: compila la SPA, sincroniza infraestructura y reinicia.
# Requiere: clave SSH en .secrets/matmax_ed25519 y acceso root al servidor.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSH_KEY="${SSH_KEY:-${ROOT}/.secrets/matmax_ed25519}"
DEPLOY_HOST="${DEPLOY_HOST:-root@185.176.254.121}"
REMOTE_PATH="${REMOTE_PATH:-/opt/matmax-crm}"
SSH_OPTS=(-i "${SSH_KEY}" -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile="${ROOT}/.secrets/known_hosts")
REBUILD="${REBUILD:-0}"

[ -f "${SSH_KEY}" ] || { echo "Falta la clave SSH: ${SSH_KEY}" >&2; exit 1; }

echo "==> Compilando SPA"
export HOME="${ROOT}/.home"
export NODE_ENV=development
export npm_config_cache="${ROOT}/.npm-cache"
mkdir -p "${HOME}" "${npm_config_cache}"
cd "${ROOT}/web"
if [ ! -d node_modules ]; then
  npm ci --no-audit --no-fund
fi
npm run build
cd "${ROOT}"

echo "==> Sincronizando infraestructura"
rsync -az --delete \
  --exclude '.env' --exclude 'secrets/' --exclude 'backups/' --exclude 'web/' --exclude 'demo/' \
  -e "ssh ${SSH_OPTS[*]}" \
  "${ROOT}/infra/" "${DEPLOY_HOST}:${REMOTE_PATH}/"

echo "==> Sincronizando SPA"
rsync -az --delete \
  -e "ssh ${SSH_OPTS[*]}" \
  "${ROOT}/web/dist/" "${DEPLOY_HOST}:${REMOTE_PATH}/web/dist/"

echo "==> Ajustando permisos y arrancando servicios"
ssh "${SSH_OPTS[@]}" "${DEPLOY_HOST}" "
  set -e
  chmod -R a+rX ${REMOTE_PATH}/web/dist
  chmod 600 ${REMOTE_PATH}/.env 2>/dev/null || true
  cd ${REMOTE_PATH}
  docker compose config >/dev/null
  if [ '${REBUILD}' = '1' ]; then docker compose build web; fi
  docker compose up -d
  docker exec matmax-app mkdir -p /var/www/html/client/custom/css
  docker cp ${REMOTE_PATH}/custom/client/css/custom.css matmax-app:/var/www/html/client/custom/css/custom.css
  docker exec matmax-app chmod 644 /var/www/html/client/custom/css/custom.css
  docker compose ps
"

echo
echo "SPA:      https://crm.matmax.site"
echo "Admin:    https://crm.matmax.site:8443 (DNS admin opcional)"
echo "Túnel:    ssh -N -L 8091:127.0.0.1:8091 ${DEPLOY_HOST}"
