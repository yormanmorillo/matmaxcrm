#!/usr/bin/env bash
# Crea de forma idempotente las entidades custom de tratamientos y presupuestos.
# No modifica el núcleo de EspoCRM; usa Entity Manager / Field Manager por API.
set -euo pipefail
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

entity_exists() {
  [ "$(curl -sS -o /dev/null -w '%{http_code}' -H "$H" "${API}/$1?maxSize=1")" = "200" ]
}

field_exists() {
  [ "$(curl -sS -o /dev/null -w '%{http_code}' -H "$H" "${API}/Admin/fieldManager/$1/$2")" = "200" ]
}

create_entity() {
  local key="$1" payload="$2"
  if entity_exists "$key"; then
    echo "  entidad $key: ya existe"
    return
  fi
  echo "  entidad $key: creando"
  curl -fsS -X POST -H "$H" -H 'Content-Type: application/json' -d "$payload" \
    "${API}/EntityManager/action/createEntity" >/dev/null
}

create_field() {
  local scope="$1" name="$2" payload="$3"
  if field_exists "$scope" "$name"; then
    echo "  campo $scope.$name: ya existe"
    return
  fi
  echo "  campo $scope.$name: creando"
  curl -fsS -X POST -H "$H" -H 'Content-Type: application/json' -d "$payload" \
    "${API}/Admin/fieldManager/${scope}" >/dev/null
}

echo "==> Entidades custom"
create_entity "CTreatment" '{"name":"Treatment","type":"Base","labelSingular":"Tratamiento","labelPlural":"Tratamientos","stream":true,"sortBy":"name","sortDirection":"asc"}'
create_entity "CCQuote" '{"name":"CQuote","type":"Base","labelSingular":"Presupuesto","labelPlural":"Presupuestos","stream":true,"sortBy":"createdAt","sortDirection":"desc"}'

echo "==> Campos de Tratamiento"
create_field CTreatment price '{"name":"price","type":"currency","required":true,"default":0,"min":0,"label":"Precio"}'
create_field CTreatment category '{"name":"category","type":"enum","options":["Diagnóstico","Ortodoncia","Implantología","Estética","General","Otro"],"default":"General","required":true,"label":"Categoría"}'
create_field CTreatment duration '{"name":"duration","type":"int","default":30,"min":0,"required":true,"label":"Duración (min)"}'
create_field CTreatment active '{"name":"active","type":"bool","default":true,"label":"Activo"}'

echo "==> Campos de Presupuesto"
create_field CCQuote status '{"name":"status","type":"enum","options":["Draft","Sent","Accepted","Rejected","Expired"],"default":"Draft","required":true,"label":"Estado"}'
create_field CCQuote validUntil '{"name":"validUntil","type":"date","label":"Válido hasta"}'
create_field CCQuote taxRate '{"name":"taxRate","type":"float","default":13,"min":0,"max":100,"label":"IVA %"}'
create_field CCQuote subtotal '{"name":"subtotal","type":"currency","default":0,"label":"Subtotal"}'
create_field CCQuote taxAmount '{"name":"taxAmount","type":"currency","default":0,"label":"IVA"}'
create_field CCQuote total '{"name":"total","type":"currency","default":0,"label":"Total"}'
create_field CCQuote items '{"name":"items","type":"text","label":"Líneas"}'
create_field CCQuote notes '{"name":"notes","type":"text","label":"Notas"}'
create_field CCQuote opportunityId '{"name":"opportunityId","type":"varchar","maxLength":50,"label":"ID oportunidad"}'
create_field CCQuote opportunityName '{"name":"opportunityName","type":"varchar","maxLength":255,"label":"Oportunidad"}'
create_field CCQuote accountId '{"name":"accountId","type":"varchar","maxLength":50,"label":"ID empresa"}'
create_field CCQuote accountName '{"name":"accountName","type":"varchar","maxLength":255,"label":"Empresa"}'
create_field CCQuote contactId '{"name":"contactId","type":"varchar","maxLength":50,"label":"ID contacto"}'
create_field CCQuote contactName '{"name":"contactName","type":"varchar","maxLength":255,"label":"Contacto"}'

TOTAL="$(curl -sS -H "$H" "${API}/CTreatment?maxSize=1&select=id" | jq -r '.total // 0')"
if [ "$TOTAL" = "0" ]; then
  echo "==> Catálogo inicial de tratamientos"
  while IFS='|' read -r name category price duration; do
    curl -fsS -X POST -H "$H" -H 'Content-Type: application/json' \
      -d "{\"name\":\"${name}\",\"category\":\"${category}\",\"price\":${price},\"duration\":${duration},\"active\":true}" \
      "${API}/CTreatment" >/dev/null
    echo "  ${name}"
  done <<'CATALOG'
Limpieza dental|General|45000|45
Blanqueamiento|Estética|180000|60
Ortodoncia invisible|Ortodoncia|3500000|90
Implante dental|Implantología|950000|120
Endodoncia|General|220000|90
Corona de porcelana|Estética|350000|90
CATALOG
else
  echo "==> Catálogo de tratamientos: ${TOTAL} registros, no se modifica"
fi

ROLE_ID="$(curl -sS -H "$H" "${API}/Role?maxSize=1&select=name&where%5B0%5D%5Btype%5D=equals&where%5B0%5D%5Bfield%5D=name&where%5B0%5D%5Bvalue%5D=Ventas" | jq -r '.list[0].id // empty')"
if [ -n "$ROLE_ID" ]; then
  echo "==> Permisos del rol Ventas"
  ROLE_DATA="$(curl -sS -H "$H" "${API}/Role/${ROLE_ID}" | jq '.data + {CTreatment:{create:"no",read:"all",edit:"no",delete:"no",stream:"no"},CCQuote:{create:"yes",read:"team",edit:"team",delete:"no",stream:"team"}}')"
  ROLE_BODY="$(jq -n --argjson d "$ROLE_DATA" '{data:$d}')"
  curl -fsS -X PATCH -H "$H" -H 'Content-Type: application/json' -d "$ROLE_BODY" "${API}/Role/${ROLE_ID}" >/dev/null
  echo "  catálogo: lectura · presupuestos: crear/leer/editar por equipo"
else
  echo "==> Rol Ventas no encontrado; asígnalo manualmente en Roles y permisos"
fi

echo "Entidades custom listas."
