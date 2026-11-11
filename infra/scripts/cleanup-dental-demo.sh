#!/usr/bin/env bash
# Elimina los datos DEMO de "Dental Demo" de forma idempotente.
# Borra por relación (accountId/parentId) y por marcador [DEMO Dental Demo].
set -uo pipefail
umask 077

BASE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE"
# shellcheck disable=SC1091
set -a; . ./.env; set +a

: "${ADMIN_USERNAME:?}" "${ADMIN_PASSWORD:?}"
API="https://crm.matmax.site/api/v1"
AUTH_BASIC="$(printf '%s:%s' "$ADMIN_USERNAME" "$ADMIN_PASSWORD" | base64 -w0)"
TOKEN="$(curl -fsS -H "Espo-Authorization: ${AUTH_BASIC}" "${API}/App/user" | jq -r .token)"
H="Espo-Authorization: $(printf '%s:%s' "$ADMIN_USERNAME" "$TOKEN" | base64 -w0)"

get_ids() {
  local entity="$1" query="$2"
  curl -sS -H "$H" "${API}/${entity}?maxSize=200&select=name&${query}" 2>/dev/null | jq -r '.list[]?.id' 2>/dev/null || true
}

delete_ids() {
  local entity="$1"
  shift
  local id code
  for id in "$@"; do
    [ -n "$id" ] && [ "$id" != "null" ] || continue
    code="$(curl -sS -o /dev/null -w '%{http_code}' -X DELETE -H "$H" "${API}/${entity}/${id}" 2>/dev/null || echo ERR)"
    printf '  %-14s %s -> %s\n' "$entity" "$id" "$code"
  done
}

ACCOUNT_ID="$(curl -sS -H "$H" "${API}/Account?maxSize=5&select=name&where%5B0%5D%5Btype%5D=textFilter&where%5B0%5D%5Bvalue%5D=Dental%20Demo" 2>/dev/null | jq -r '.list[0].id // empty' 2>/dev/null || true)"

if [ -n "$ACCOUNT_ID" ]; then
  echo "==> Cuenta Dental Demo: ${ACCOUNT_ID}"
  echo "==> Eliminando actividades vinculadas"
  for entity in Task Call Meeting; do
    mapfile -t ids < <(get_ids "$entity" "where%5B0%5D%5Btype%5D=equals&where%5B0%5D%5Bfield%5D=parentId&where%5B0%5D%5Bvalue%5D=${ACCOUNT_ID}")
    delete_ids "$entity" "${ids[@]}"
  done
  echo "==> Eliminando actividades vinculadas a contactos"
  mapfile -t contact_ids < <(get_ids Contact "where%5B0%5D%5Btype%5D=equals&where%5B0%5D%5Bfield%5D=accountId&where%5B0%5D%5Bvalue%5D=${ACCOUNT_ID}")
  for contact_id in "${contact_ids[@]}"; do
    for entity in Task Call Meeting; do
      mapfile -t ids < <(get_ids "$entity" "where%5B0%5D%5Btype%5D=equals&where%5B0%5D%5Bfield%5D=parentId&where%5B0%5D%5Bvalue%5D=${contact_id}")
      delete_ids "$entity" "${ids[@]}"
    done
  done
  echo "==> Eliminando presupuestos de la demo"
  mapfile -t opp_ids < <(get_ids Opportunity "where%5B0%5D%5Btype%5D=equals&where%5B0%5D%5Bfield%5D=accountId&where%5B0%5D%5Bvalue%5D=${ACCOUNT_ID}")
  for opp_id in "${opp_ids[@]}"; do
    mapfile -t ids < <(get_ids CCQuote "where%5B0%5D%5Btype%5D=equals&where%5B0%5D%5Bfield%5D=opportunityId&where%5B0%5D%5Bvalue%5D=${opp_id}")
    delete_ids CCQuote "${ids[@]}"
  done
  echo "==> Eliminando oportunidades"
  mapfile -t ids < <(get_ids Opportunity "where%5B0%5D%5Btype%5D=equals&where%5B0%5D%5Bfield%5D=accountId&where%5B0%5D%5Bvalue%5D=${ACCOUNT_ID}")
  delete_ids Opportunity "${ids[@]}"
  echo "==> Eliminando contactos"
  mapfile -t ids < <(get_ids Contact "where%5B0%5D%5Btype%5D=equals&where%5B0%5D%5Bfield%5D=accountId&where%5B0%5D%5Bvalue%5D=${ACCOUNT_ID}")
  delete_ids Contact "${ids[@]}"
else
  echo "==> No se encontró la cuenta Dental Demo; se limpian por marcador"
fi

echo "==> Eliminando leads de la demo"
mapfile -t ids < <(get_ids Lead "where%5B0%5D%5Btype%5D=contains&where%5B0%5D%5Bfield%5D=emailAddress&where%5B0%5D%5Bvalue%5D=dentaldemo.example")
delete_ids Lead "${ids[@]}"

echo "==> Eliminando actividades con marcador"
for entity in Task Call Meeting; do
  mapfile -t ids < <(get_ids "$entity" "where%5B0%5D%5Btype%5D=textFilter&where%5B0%5D%5Bvalue%5D=DEMO%20Dental%20Demo")
  delete_ids "$entity" "${ids[@]}"
done

if [ -n "$ACCOUNT_ID" ]; then
  echo "==> Eliminando cuenta"
  delete_ids Account "$ACCOUNT_ID"
fi

IDS_FILE="${BASE}/demo/dental-demo-ids.json"
if [ -f "$IDS_FILE" ]; then
  echo "==> Eliminando IDs registrados de la demo"
  for pair in "CCQuote:quotes" "Task:tasks" "Call:calls" "Meeting:meetings" "Opportunity:opportunities" "Lead:leads" "Contact:contacts"; do
    entity="${pair%%:*}"
    key="${pair##*:}"
    mapfile -t ids < <(jq -r --arg k "$key" '.[$k][]?' "$IDS_FILE" 2>/dev/null || true)
    delete_ids "$entity" "${ids[@]}"
  done
fi
rm -f "${BASE}/demo/dental-demo-ids.json"
rmdir "${BASE}/demo" 2>/dev/null || true

echo "Dental Demo eliminada."
