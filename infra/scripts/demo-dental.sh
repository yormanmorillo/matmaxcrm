#!/usr/bin/env bash
# Carga datos DEMO temporales bajo la cuenta "Dental Demo".
# Uso: ./scripts/demo-dental.sh
# Borrado: ./scripts/cleanup-dental-demo.sh
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
[ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] || { echo "No se pudo autenticar" >&2; exit 1; }
H="Espo-Authorization: $(printf '%s:%s' "$ADMIN_USERNAME" "$TOKEN" | base64 -w0)"

ADMIN_ID="$(curl -fsS -H "$H" "${API}/App/user" | jq -r .user.id)"
TEAM_ID="$(curl -fsS -H "$H" "${API}/Team?maxSize=20&select=name" | jq -r '.list[] | select(.name=="Comercial") | .id' | head -1)"
[ -n "$TEAM_ID" ] || { echo "No existe el equipo Comercial" >&2; exit 1; }

DEMO_DIR="${BASE}/demo"
mkdir -p "$DEMO_DIR"
IDS_FILE="${DEMO_DIR}/dental-demo-ids.json"
if [ -f "$IDS_FILE" ]; then
  echo "Ya existe una carga Dental Demo (${IDS_FILE})."
  echo "Ejecuta ./scripts/cleanup-dental-demo.sh antes de volver a cargarla."
  exit 1
fi
EXISTING_ACCOUNT="$(curl -fsS -H "$H" "${API}/Account?maxSize=1&select=name&where%5B0%5D%5Btype%5D=textFilter&where%5B0%5D%5Bvalue%5D=Dental%20Demo" | jq -r '.list[0].id // empty')"
if [ -n "$EXISTING_ACCOUNT" ]; then
  echo "Ya existe la cuenta Dental Demo (${EXISTING_ACCOUNT})."
  echo "Elimínala con ./scripts/cleanup-dental-demo.sh antes de volver a cargarla."
  exit 1
fi

TODAY="$(date +%F)"
D_PLUS_1="$(date -d '+1 day' +%F)"
D_PLUS_2="$(date -d '+2 days' +%F)"
D_PLUS_3="$(date -d '+3 days' +%F)"
D_PLUS_7="$(date -d '+7 days' +%F)"
D_PLUS_17="$(date -d '+17 days' +%F)"
D_PLUS_34="$(date -d '+34 days' +%F)"
D_PLUS_70="$(date -d '+70 days' +%F)"
D_PLUS_96="$(date -d '+96 days' +%F)"
D_MINUS_1="$(date -d '-1 day' +%F)"
D_MINUS_3="$(date -d '-3 days' +%F)"
D_MINUS_4="$(date -d '-4 days' +%F)"
D_MINUS_5="$(date -d '-5 days' +%F)"
D_MINUS_7="$(date -d '-7 days' +%F)"
D_PLUS_30="$(date -d '+30 days' +%F)"
D_MINUS_14="$(date -d '-14 days' +%F)"

# EspoCRM almacena datetime en UTC; la demo se define en hora de Costa Rica.
utc() { local ts; ts="$(date -d "$1" +%s)"; date -u -d "@$ts" '+%F %T'; }

post() {
  local entity="$1" body="$2" response
  response="$(curl -fsS -X POST -H "$H" -H 'Content-Type: application/json' -d "$body" "${API}/${entity}")"
  printf '%s' "$response" | jq -e -r '.id // empty'
}

echo "==> Creando cuenta Dental Demo"
ACCOUNT_ID="$(post Account "$(cat <<EOF
{
  "name": "Dental Demo",
  "type": "Customer",
  "industry": "Healthcare",
  "website": "https://dentaldemo.example",
  "emailAddress": "info@dentaldemo.example",
  "phoneNumber": "+506 2222 0101",
  "description": "[DEMO Dental Demo] Cuenta de DEMOSTRACIÓN TEMPORAL para validar MATMAX CRM. Clínica dental con tres sedes. Se puede eliminar con scripts/cleanup-dental-demo.sh.",
  "assignedUserId": "${ADMIN_ID}",
  "teamsIds": ["${TEAM_ID}"],
  "billingAddressStreet": "Avenida Central, Barrio Amón",
  "billingAddressCity": "San José",
  "billingAddressState": "San José",
  "billingAddressPostalCode": "10101",
  "billingAddressCountry": "Costa Rica"
}
EOF
)")"
[ -n "$ACCOUNT_ID" ] || { echo "Error creando cuenta" >&2; exit 1; }

contact() {
  post Contact "$(cat <<EOF
{
  "firstName": "$1",
  "lastName": "$2",
  "title": "$3",
  "emailAddress": "$4",
  "phoneNumber": "$5",
  "description": "[DEMO Dental Demo] Contacto de la cuenta de demostración.",
  "accountId": "${ACCOUNT_ID}",
  "assignedUserId": "${ADMIN_ID}",
  "teamsIds": ["${TEAM_ID}"]
}
EOF
)"
}

echo "==> Creando contactos"
C1="$(contact 'María José' 'Solano' 'Directora médica' 'maria.solano@dentaldemo.example' '+506 8810 1201')"
C2="$(contact 'Jorge' 'Ramírez' 'Gerente' 'jorge.ramirez@dentaldemo.example' '+506 8810 1202')"
C3="$(contact 'Andrea' 'Vargas' 'Recepción y pacientes' 'andrea.vargas@dentaldemo.example' '+506 8810 1203')"
C4="$(contact 'Carlos' 'Montero' 'Ortodoncista' 'carlos.montero@dentaldemo.example' '+506 8810 1204')"

lead() {
  post Lead "$(cat <<EOF
{
  "firstName": "$1",
  "lastName": "$2",
  "accountName": "$3",
  "status": "$4",
  "source": "$5",
  "industry": "Healthcare",
  "emailAddress": "$6",
  "phoneNumber": "$7",
  "opportunityAmount": $8,
  "description": "[DEMO Dental Demo] $9",
  "assignedUserId": "${ADMIN_ID}",
  "teamsIds": ["${TEAM_ID}"]
}
EOF
)"
}

echo "==> Creando leads"
L1="$(lead 'Gabriela' 'Rojas' 'Clínica Dental Sonrisa' 'New' 'Web Site' 'gabriela.rojas@dentaldemo.example' '+506 8820 3301' 2300000 'Solicita información sobre ortodoncia invisible para 20 casos.')"
L2="$(lead 'Mauricio' 'Castro' 'Dental Norte' 'In Process' 'Call' 'mauricio.castro@dentaldemo.example' '+506 8820 3302' 4100000 'Interesado en renovar equipamiento de rayos X. Pendiente visita.')"
L3="$(lead 'Valeria' 'Jiménez' 'Clínica Dental Vital' 'Assigned' 'Email' 'valeria.jimenez@dentaldemo.example' '+506 8820 3303' 1700000 'Pide propuesta de formación para el equipo clínico.')"
L4="$(lead 'Esteban' 'Mora' 'Centro Odontológico Sur' 'Recycled' 'Partner' 'esteban.mora@dentaldemo.example' '+506 8820 3304' 6000000 'Presupuesto aplazado al próximo trimestre.')"

opportunity() {
  post Opportunity "$(cat <<EOF
{
  "name": "$1",
  "accountId": "${ACCOUNT_ID}",
  "contactId": "$2",
  "stage": "$3",
  "amount": $4,
  "probability": $5,
  "closeDate": "$6",
  "description": "[DEMO Dental Demo] $7",
  "assignedUserId": "${ADMIN_ID}",
  "teamsIds": ["${TEAM_ID}"]
}
EOF
)"
}

echo "==> Creando oportunidades"
O1="$(opportunity 'Implantología — pack 12 implantes' "$C1" 'Negotiation' 9500000 75 "$D_PLUS_17" 'Pendiente aprobación financiera de la clínica.')"
O2="$(opportunity 'Ortodoncia invisible — 20 casos' "$C4" 'Proposal' 6400000 55 "$D_PLUS_34" 'Propuesta enviada; falta validar alineadores.')"
O3="$(opportunity 'Renovación equipamiento rayos X' "$C2" 'Qualification' 5100000 30 "$D_PLUS_70" 'Comparando dos proveedores.')"
O4="$(opportunity 'Software de gestión clínica — 3 sedes' "$C1" 'Prospecting' 11200000 10 "$D_PLUS_96" 'Necesidad detectada en la reunión inicial.')"
O5="$(opportunity 'Formación equipo clínico' "$C3" 'Closed Won' 1650000 100 "$D_MINUS_7" 'Formación cerrada y facturada.')"
O6="$(opportunity 'Campaña de captación de pacientes' "$C2" 'Closed Lost' 2800000 0 "$D_MINUS_14" 'Descartado por presupuesto interno.')"

task() {
  post Task "$(cat <<EOF
{
  "name": "$1",
  "status": "$2",
  "priority": "$3",
  "dateEnd": "$4",
  "parentId": "$5",
  "parentType": "Contact",
  "description": "[DEMO Dental Demo] $6",
  "assignedUserId": "${ADMIN_ID}",
  "teamsIds": ["${TEAM_ID}"]
}
EOF
)"
}

echo "==> Creando tareas"
T1="$(task 'Enviar propuesta de implantes' 'Not Started' 'High' "$(utc "${D_PLUS_2} 16:00:00")" "$C1" 'Adjuntar desglose de implantes y financiación.')"
T2="$(task 'Llamar a Jorge para revisar presupuesto' 'Started' 'Urgent' "$(utc "${D_PLUS_1} 11:00:00")" "$C2" 'Revisar margen y condiciones de pago.')"
T3="$(task 'Preparar demo del software de gestión' 'Not Started' 'Normal' "$(utc "${D_PLUS_7} 09:00:00")" "$C1" 'Preparar entorno con tres sedes de ejemplo.')"
T4="$(task 'Revisar contrato de formación' 'Completed' 'Normal' "$(utc "${D_MINUS_3} 09:00:00")" "$C3" 'Contrato revisado y firmado.')"
T5="$(task 'Confirmar financiación de ortodoncia' 'Not Started' 'Urgent' "$(utc "${D_MINUS_1} 10:00:00")" "$C4" 'Seguimiento vencido: falta confirmación del paciente.')"

call() {
  post Call "$(cat <<EOF
{
  "name": "$1",
  "status": "$2",
  "direction": "Outbound",
  "dateStart": "$3",
  "dateEnd": "$4",
  "parentId": "$6",
  "parentType": "Contact",
  "description": "[DEMO Dental Demo] $5",
  "assignedUserId": "${ADMIN_ID}",
  "teamsIds": ["${TEAM_ID}"]
}
EOF
)"
}

echo "==> Creando llamadas"
K1="$(call 'Llamada de seguimiento — ortodoncia' 'Planned' "$(utc "${D_PLUS_1} 09:00:00")" "$(utc "${D_PLUS_1} 09:30:00")" 'Confirmar recepción de la propuesta.' "$C1")"
K2="$(call 'Llamada inicial — rayos X' 'Held' "$(utc "${D_MINUS_4} 10:00:00")" "$(utc "${D_MINUS_4} 10:30:00")" 'Primera toma de contacto con el gerente.' "$C2")"

meeting() {
  post Meeting "$(cat <<EOF
{
  "name": "$1",
  "status": "$2",
  "dateStart": "$3",
  "dateEnd": "$4",
  "parentId": "$6",
  "parentType": "Contact",
  "description": "[DEMO Dental Demo] $5",
  "assignedUserId": "${ADMIN_ID}",
  "teamsIds": ["${TEAM_ID}"]
}
EOF
)"
}

echo "==> Creando reuniones"
M1="$(meeting 'Demo en clínica — 3 sedes' 'Planned' "$(utc "${D_PLUS_3} 10:00:00")" "$(utc "${D_PLUS_3} 11:00:00")" 'Demostración del software en la sede principal.' "$C1")"
M2="$(meeting 'Reunión financiera — implantes' 'Held' "$(utc "${D_MINUS_5} 15:00:00")" "$(utc "${D_MINUS_5} 16:00:00")" 'Revisión de condiciones de financiación.' "$C2")"

note() {
  curl -fsS -X POST -H "$H" -H 'Content-Type: application/json' \
    -d "{\"type\":\"Post\",\"parentId\":\"$1\",\"parentType\":\"$2\",\"post\":\"$3\"}" \
    "${API}/Note" >/dev/null
}

echo "==> Creando notas de ejemplo"
note "$ACCOUNT_ID" Account 'Cuenta DEMO TEMPORAL. Clínica con tres sedes en San José, Heredia y Cartago; contacto principal: Dra. María José Solano.'
note "$C1" Contact 'Prefiere comunicación por email y reuniones los martes por la mañana.'
note "$O1" Opportunity 'Negociación de pack de 12 implantes; pendiente aprobación financiera.'

echo "==> Creando presupuesto de ejemplo"
QUOTE_BODY="$(jq -n \
  --arg valid "$D_PLUS_30" \
  --arg team "$TEAM_ID" \
  --arg opp "$O1" \
  --arg account "$ACCOUNT_ID" \
  --arg contact "$C1" \
  '{name:"Presupuesto — Implantología",status:"Sent",validUntil:$valid,taxRate:13,subtotal:1300000,taxAmount:169000,total:1469000,subtotalCurrency:"CRC",taxAmountCurrency:"CRC",totalCurrency:"CRC",items:([{treatmentId:"",name:"Implante dental",qty:1,price:950000},{treatmentId:"",name:"Corona de porcelana",qty:1,price:350000}]|tojson),opportunityId:$opp,opportunityName:"Implantología — pack 12 implantes",accountId:$account,accountName:"Dental Demo",contactId:$contact,contactName:"María José Solano",notes:"Incluye implante y corona. IVA 13% incluido.",assignedUserId:null,teamsIds:[$team]}' \
)"
Q1="$(curl -fsS -X POST -H "$H" -H 'Content-Type: application/json' -d "$QUOTE_BODY" "${API}/CCQuote" | jq -r .id)"
echo "  Presupuesto:  $Q1"

jq -n \
  --arg account "$ACCOUNT_ID" \
  --argjson contacts "[\"$C1\",\"$C2\",\"$C3\",\"$C4\"]" \
  --argjson leads "[\"$L1\",\"$L2\",\"$L3\",\"$L4\"]" \
  --argjson opportunities "[\"$O1\",\"$O2\",\"$O3\",\"$O4\",\"$O5\",\"$O6\"]" \
  --argjson tasks "[\"$T1\",\"$T2\",\"$T3\",\"$T4\",\"$T5\"]" \
  --argjson calls "[\"$K1\",\"$K2\"]" \
  --argjson meetings "[\"$M1\",\"$M2\"]" \
  --argjson quotes "[\"$Q1\"]" \
  '{createdAt: now|todate, account: $account, contacts: $contacts, leads: $leads, opportunities: $opportunities, tasks: $tasks, calls: $calls, meetings: $meetings, quotes: $quotes}' \
  > "$IDS_FILE"
chmod 600 "$IDS_FILE"

echo
echo "Dental Demo cargada:"
echo "  Cuenta:        $ACCOUNT_ID"
echo "  Contactos:     4"
echo "  Leads:         4"
echo "  Oportunidades: 6 (4 abiertas, 1 ganada, 1 perdida)"
echo "  Tareas:        5 (4 pendientes)"
echo "  Llamadas:      2"
echo "  Reuniones:     2"
echo "  Presupuestos:  1"
echo
echo "Para eliminarla: ./scripts/cleanup-dental-demo.sh"
