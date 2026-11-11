# Arquitectura omnicanal — MATMAX CRM

Estado: **diseño**, no implementado. La SPA muestra estos módulos como *Pendientes* y no hay datos ni conexiones simuladas.

Objetivo: incorporar WhatsApp Business Cloud API, Facebook Messenger, Instagram Messaging y email IMAP/SMTP a una bandeja única, sin acoplar el CRM base a un proveedor.

---

## 1. Principios

1. **Canal desacoplado:** cada proveedor entra por un adaptador que normaliza eventos a un modelo común.
2. **Idempotencia:** todo webhook se procesa por `external_id` + `channel_id`; los duplicados se ignoran.
3. **Seguridad:** HTTPS obligatorio, validación de firma HMAC, tolerancia temporal y lista de IPs cuando el proveedor la publique.
4. **Permisos:** una conversación hereda el equipo/propietario del contacto; la ACL de EspoCRM sigue siendo la autoridad.
5. **n8n opcional:** la cola y los webhooks viven en el CRM; n8n puede orquestar sin ser dependencia.
6. **Sin secretos en el navegador:** tokens de canal solo en el backend/gestor de secretos.

---

## 2. Modelo de datos propuesto

Entidades propias (extensión/Entity Manager o servicio satélite), no modificaciones del núcleo:

### `Channel`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | id | |
| `name` | varchar | “WhatsApp Ventas”, “Email soporte” |
| `type` | enum | `whatsapp`, `facebook`, `instagram`, `email` |
| `status` | enum | `active`, `paused`, `error` |
| `externalAccountId` | varchar | phone number id / page id / mailbox |
| `credentialsRef` | varchar | referencia a secreto, nunca el token |
| `webhookSecretRef` | varchar | referencia al secreto HMAC |
| `defaultTeamId` | link → Team | enrutado por defecto |
| `defaultAssigneeId` | link → User | |
| `lastSyncAt` | datetime | |

### `Conversation`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | id | |
| `channelId` | link → Channel | |
| `contactId` | link → Contact | |
| `accountId` | link → Account | opcional |
| `leadId` | link → Lead | si aún no es contacto |
| `subject` | varchar | email o resumen |
| `status` | enum | `open`, `pending`, `snoozed`, `closed` |
| `priority` | enum | `low`, `normal`, `high`, `urgent` |
| `assignedUserId` | link → User | |
| `teamId` | link → Team | |
| `lastMessageAt` | datetime | ordenación de bandeja |
| `lastInboundAt` | datetime | ventana de 24 h WhatsApp |
| `unreadCount` | int | |
| `externalThreadId` | varchar | hilo del proveedor |
| `tags` | multi-enum | |

### `Message`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | id | |
| `conversationId` | link → Conversation | |
| `direction` | enum | `inbound`, `outbound` |
| `type` | enum | `text`, `image`, `file`, `audio`, `template`, `system` |
| `body` | text | texto normalizado |
| `mediaIds` | array | adjuntos en almacenamiento propio |
| `externalId` | varchar | id del proveedor (idempotencia) |
| `status` | enum | `queued`, `sent`, `delivered`, `read`, `failed` |
| `error` | text | |
| `sentAt` / `deliveredAt` / `readAt` | datetime | |
| `authorUserId` | link → User | agente que respondió |
| `rawPayload` | json | auditoría/depuración, con retención limitada |

### `ChannelEvent` (webhook inbox)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | id | |
| `channelId` | link | |
| `externalId` | varchar | clave de idempotencia |
| `signatureValid` | bool | |
| `receivedAt` | datetime | |
| `processedAt` | datetime | |
| `status` | enum | `received`, `processed`, `ignored`, `failed` |
| `payload` | json | |
| `error` | text | |

---

## 3. Flujo de entrada

```
Proveedor ──HTTPS POST──► /api/webhooks/{channel}
                             │
                             ├─ verificar firma HMAC + timestamp
                             ├─ insertar ChannelEvent (idempotente)
                             ├─ responder 2xx rápido
                             ▼
                       cola persistente
                             │
                             ├─ normalizar a Message
                             ├─ resolver contacto/canal
                             ├─ crear/actualizar Conversation
                             ├─ asignar equipo/prioridad
                             └─ notificar a la bandeja
```

- El webhook **no** hace trabajo pesado: solo valida, persiste y responde.
- Los reintentos usan backoff exponencial y una tabla de intentos.
- Si la firma falla → `401`, se registra el intento y se alerta.

## 4. Flujo de salida

```
Agente escribe en la bandeja
   → POST /api/conversations/{id}/messages
   → validar ACL y ventana de conversación
   → encolar outbound
   → adaptador del canal envía
   → actualizar status (sent/delivered/read/failed)
```

- WhatsApp: respetar plantillas y ventana de 24 h.
- Email: SMTP con TLS; se guarda `Message-ID` para hilos.
- Reintentos y errores visibles al agente; nunca se marca “enviado” sin confirmación.

---

## 5. API propuesta

```
GET    /api/channels
POST   /api/channels
GET    /api/conversations?status=open&assignee=me&channel=...
GET    /api/conversations/{id}
POST   /api/conversations/{id}/messages
PATCH  /api/conversations/{id}          # estado, prioridad, asignación
POST   /api/conversations/{id}/read
GET    /api/conversations/{id}/messages
POST   /api/webhooks/{channel}          # público, firmado
```

La SPA consumiría estos endpoints a través del mismo proxy same-origin y con la sesión del usuario; el backend traduce a la ACL de EspoCRM.

---

## 6. Seguridad de webhooks

- HTTPS obligatorio; rechazar HTTP.
- Firma HMAC-SHA256 del cuerpo crudo con secreto por canal.
- Cabecera de timestamp + ventana de tolerancia (5 min) para evitar replay.
- Comparación en tiempo constante.
- Límite de tamaño y rate limit por canal/IP.
- Registro de `signatureValid`, IP y `externalId`.
- Secretos en `/run/secrets` o gestor externo; nunca en la base de datos en claro.

---

## 7. Relación con n8n

n8n puede:

- consumir webhooks del CRM,
- enriquecer contactos,
- enviar notificaciones,
- orquestar campañas.

Pero el CRM **no depende** de n8n para recibir mensajes, almacenarlos o mostrarlos. Si n8n cae, la bandeja sigue operativa.

---

## 8. Fases de implementación

1. Modelo `Channel`/`Conversation`/`Message`/`ChannelEvent` y migraciones.
2. Webhook inbox + verificación HMAC + cola.
3. Adaptador email IMAP/SMTP (el más sencillo para validar el modelo).
4. WhatsApp Cloud API (plantillas, media, estados).
5. Facebook/Instagram Messenger.
6. Pantalla de bandeja: lista, hilo, respuesta, asignación, prioridad.
7. Pruebas de carga, idempotencia y seguridad.

---

## 9. Lo que no se hará

- No se simularán conversaciones ni canales “conectados”.
- No se guardarán tokens de Meta en el frontend.
- No se acoplará el modelo a WhatsApp: el CRM debe seguir funcionando si el proveedor cambia.
- No se añadirá Redis/Elasticsearch solo para este módulo sin medir el impacto.
