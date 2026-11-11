# MATMAX CRM — Plan técnico de instalación y rediseño

**Fecha:** 2026-11-11 04:05 CET
**Servidor:** `185.176.254.121` (`vmi3740643`) · Dominio: `crm.matmax.site`
**Estado:** Etapa 1 completada (inspección). **Nada se ha modificado todavía.**

---

## 1. Resumen ejecutivo

Se instalará **EspoCRM 10.0.12** (última imagen estable disponible en Docker Hub; la 10.1.1 aún no está publicada como imagen) como motor CRM, sobre **MariaDB 11.8**, con **Nginx + PHP-FPM** y el **daemon** oficial de tareas programadas. Delante se desplegará una **SPA propia en Vue 3 + TypeScript + Tailwind** que consume la API REST de EspoCRM a través de un proxy same-origin.

El servidor ya aloja **ERPNext** (a retirar, con backup previo), **DeskComm + Supabase** (fuera de alcance, no se tocará) y **Dockhand**. La RAM es el recurso crítico: el stack actual consume ~5,7 GiB de 7,8 GiB. La retirada de ERPNext libera ~0,6 GiB; el stack MATMAX se dimensionará para **≤ 1 GiB reales** (objetivo de diseño 2 GiB para el CRM). **No es posible cumplir 2 GiB de consumo total del servidor** porque DeskComm/Supabase ya consumen ~3,2 GiB por sí solos; esto se documentará con medición real, sin ocultarlo.

No se modificará el núcleo de EspoCRM: personalizaciones solo por API, Entity Manager y volúmenes `custom/`, `client/custom/` y `data/`.

---

## 2. Inventario verificado

### 2.1 Hardware y sistema

| Elemento | Valor real |
|---|---|
| CPU | 4 vCPU (x86_64) |
| RAM | 7,8 GiB totales · 5,7 GiB usados · 2,1 GiB disponibles |
| Swap | 4 GiB (1,2 GiB en uso) |
| Disco | 96 GB ext4 · 34 GB usados · **63 GB libres** (35 %) |
| Inodos | 9 % usado |
| SO | Ubuntu 24.04.5 LTS (kernel 6.8.0-147) |
| Docker | 29.1.3 |
| Docker Compose | 2.40.3 |
| Zona horaria | Europe/Berlin (CET) → ajustada a **America/Costa_Rica** |
| Firewall | UFW activo: solo 22, 80, 443/tcp |
| Load average | 4,89 / 5,06 / 4,92 (presión por Supabase) |

### 2.2 Servicios existentes

| Servicio | Contenedores | RAM aprox. | Decisión |
|---|---|---|---|
| **ERPNext 16.54** | 11 contenedores (frontend, backend, websocket, 2 queues, scheduler, db, 2 redis, configurator, create-site) | ~606 MiB | **Retirar** con backup previo y autorización |
| **DeskComm + Supabase** | 14 contenedores (app, worker, WAHA, Kong, Postgres, Auth, Storage, Realtime, Studio, etc.) | ~3,2 GiB | **NO TOCAR** (fuera de alcance) |
| **Dockhand** | 1 | ~88 MiB | **NO TOCAR** |
| **Caddy** (host) | systemd | ~28 MiB | Se reutiliza para TLS y enrutado |

### 2.3 Enrutado actual

```
crm.matmax.site  → Caddy :443 → 127.0.0.1:8080 → ERPNext frontend
desk.matmax.site → Caddy :443 → 127.0.0.1:3001 (DeskComm) + /supabase/* → :54321
```

- `crm.matmax.site` y `desk.matmax.site` resuelven a `185.176.254.121`.
- **No hay DNS comodín**: `admin.crm.matmax.site` y `espocrm.matmax.site` **no resuelven**.
- Certificados TLS gestionados automáticamente por Caddy.

### 2.4 Datos de ERPNext a preservar antes del borrado

| Elemento | Detalle |
|---|---|
| Sitio | `crm.lapizzeria.food` (¡no es matmax.site!) |
| Base de datos | `_f7439905270eeb57` · 49,1 MB · 766 tablas |
| Volumen `erpnext_sites` | 804 KB |
| Volumen `erpnext_db-data` | ~? (incluido en 429 MB total de volúmenes) |
| Imágenes | `frappe/erpnext:v16.54.0` (4,62 GB), `redis:6.2-alpine` (41,7 MB) |
| Directorios | `/opt/erpnext` (compose), `/opt/frappe_docker` (repo upstream) |

> El backup se hará **antes** de cualquier `down -v`. Se conservará fuera del servidor y en `/root/backups/` con retención de 30 días. La imagen `mariadb:11.8` se reutilizará para EspoCRM (no se borra).

---

## 3. Hallazgos y riesgos

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R1 | RAM ajustada: Supabase Postgres usa 2,4 GiB y 379 % CPU | OOM / lentitud | Límites `mem_limit` por servicio, MariaDB con buffer pool 256 MB y `performance_schema=OFF`, PHP-FPM `ondemand`, sin Redis/Elasticsearch/websocket. Medición y alerta documentadas. |
| R2 | Borrado de ERPNext destruye el sitio `crm.lapizzeria.food` | Pérdida de datos | Backup completo verificado + copia local + retención 30 días. Autorización explícita. |
| R3 | `crm.matmax.site` sirve ERPNext: al retirarlo habrá **cortes** hasta que arranque MATMAX | Downtime | Ventana de mantenimiento; instalar y validar EspoCRM en `:8090` **antes** de conmutar Caddy; conmutación atómica y rollback inmediato. |
| R4 | Sin DNS comodín no hay hostname limpio para la UI nativa de administración | Admin limitado | Opción A (recomendada): crear `admin.crm.matmax.site` A → IP. Opción B: publicar UI nativa en `https://crm.matmax.site:8443` (UFW + Caddy). Opción C: solo túnel SSH. |
| R5 | EspoCRM es **AGPLv3** | Distribución comercial | No se modifica el núcleo. Para vender el producto empaquetado, revisar obligaciones AGPL (ofrecer código a usuarios de red) o adquirir licencia comercial de EspoCRM. Documento legal separado. |
| R6 | OAuth 2.0 solo existe desde 10.1; la imagen disponible es 10.0.12 | Autenticación | Fase 1: token oficial `Espo-Authorization` (el mismo que usa la UI de EspoCRM), `sessionStorage`, HTTPS y CSP estricta. Migración a OAuth 2.0 + PKCE cuando 10.1.x esté publicada. |
| R7 | La UI nativa y la SPA comparten API y cookies | Seguridad | Proxy same-origin, sin CORS abierto, CSP, rate-limit en login, sin credenciales de admin en el navegador. |

---

## 4. Arquitectura propuesta

```
                    Internet (443/80)
                           │
                    ┌──────▼──────┐
                    │ Caddy (host)│  TLS automático, HSTS, HTTP/2-3
                    └──────┬──────┘
                           │ 127.0.0.1:8090
                    ┌──────▼──────────────────────────┐
                    │ web (nginx:1.27-alpine)         │
                    │  /            → SPA Vue (dist)  │
                    │  /api/        → espocrm:80      │
                    │  /oauth/      → espocrm:80      │
                    │  /healthz     → 200             │
                    └──────┬──────────────────────────┘
                           │ red edge
                    ┌──────▼──────────────┐
                    │ espocrm 10.0.12     │  Nginx+PHP-FPM oficial
                    │  + daemon (cron)    │
                    └──────┬──────────────┘
                           │ red db (interna)
                    ┌──────▼──────────────┐
                    │ mariadb:11.8.9      │  sin puerto público
                    └─────────────────────┘
```

- **Puertos publicados:** solo `127.0.0.1:8090` (web). MariaDB y EspoCRM sin puertos de host.
- **Redes:** `matmax_edge` (web ↔ espocrm) y `matmax_db` (espocrm ↔ mariadb). `web` no ve la BD.
- **Volúmenes:** `espocrm-db`, `espocrm-data`, `espocrm-custom`, `espocrm-custom-client`, `matmax-backups` (opcional).
- **Sin** Redis, Elasticsearch, websocket ni Node en producción. El SPA se compila y se sirve estático.

### 4.1 Decisiones (ADR)

| Decisión | Elección | Motivo |
|---|---|---|
| Motor CRM | EspoCRM 10.0.12 (tag fijo, digest) | Última estable con imagen oficial; 10.1.1 aún sin imagen |
| BD | MariaDB 11.8.9 (tag fijo) | Compatible, ya cacheada en el host; LTS de la rama 11.8 |
| Web | Nginx 1.27-alpine + SPA estática | Cumple requisito; sin runtime Node permanente |
| TLS | Caddy existente | Ya gestiona certificados de `crm.matmax.site`; no duplicar |
| Auth | Token `Espo-Authorization` + `sessionStorage` | Mecanismo oficial, permisos por usuario; OAuth 2.0 en cuanto haya 10.1.x |
| Formularios | Metadata-driven (`/api/v1/Metadata`) | Soporta campos personalizados sin tocar código |
| Permisos | ACL de EspoCRM; UI solo oculta, nunca sustituye | Backend siempre autoritativo |
| Gráficos | SVG propios | Evitar 200+ KB de librería y dependencias |
| Kanban | SortableJS/vuedraggable | DnD real con persistencia PATCH |
| Admin | UI nativa de EspoCRM (subdominio o :8443) + pantallas propias de solo lectura | No reimplementar Entity Manager; no tocar núcleo |
| Licencia | AGPLv3, sin modificar core | Requisito #2 del cliente |

---

## 5. Fases de ejecución

### Fase 0 — Backup y retirada de ERPNext (30 min) · REQUIERE AUTORIZACIÓN
1. `docker compose -f /opt/erpnext/docker-compose.yml stop` (sin borrar).
2. `mariadb-dump --single-transaction` de `_f7439905270eeb57` + tar de volúmenes `sites`, `logs`.
3. Copia de `/opt/erpnext/docker-compose.yml`, `.env`, Caddyfile y metadatos.
4. Verificar `gzip -t`, tamaño y restauración de prueba en BD temporal.
5. Descargar copia a `185...:/root/backups/erpnext-20261111/` y al workspace local.
6. `docker compose down -v`; borrar red, volúmenes, imágenes `frappe/erpnext:*` y `redis:6.2-alpine`.
7. `rm -rf /opt/erpnext /opt/frappe_docker`.
8. Comprobar: 0 contenedores/volúmenes/imágenes ERPNext; DeskComm intacto.

**Criterio de aceptación:** backup restaurable + `https://crm.matmax.site` devuelve 502/404 controlado (aún sin MATMAX) + DeskComm sigue `healthy`.

### Fase 1 — Instalación EspoCRM (45 min)
1. Crear `/opt/matmax-crm/{nginx,php,web,backups,secrets}`.
2. `.env` con secretos generados (600), `ESPOCRM_SITE_URL=https://crm.matmax.site`, `ESPOCRM_TIME_ZONE=America/Costa_Rica`.
3. `docker compose up -d` con tags fijos y healthchecks.
4. Smoke tests: `GET /api/v1/App/user` 401 esperado, login admin, `bin/command app-check`, daemon activo.
5. Configurar: zona horaria America/Costa_Rica, moneda CRC, idioma es_ES, formato fecha, nombre del producto.
6. Crear rol `Ventas`, equipo `Comercial`, usuario de prueba (temporal) y verificar ACL.
7. Configurar SMTP/IMAP cuando el cliente aporte credenciales (queda parametrizado).
8. Conmutar Caddy `crm.matmax.site` → `127.0.0.1:8090` y validar TLS.

**Criterio:** login real, API responde, daemon ejecuta cron, sin errores en logs, RAM del stack medida.

### Fase 2 — Sistema de diseño y shell (2 h)
- Tokens (color, tipografía, spacing, radios, sombras), modo claro/oscuro persistente.
- Layout: sidebar colapsable, topbar con búsqueda global, breadcrumbs, command palette (⌘K).
- Componentes: Button, Input, Select, Dialog, Drawer, Table, Badge, Tabs, Toast, Skeleton, EmptyState, Avatar.
- Router con guards de auth/permisos y estados de carga/error.

### Fase 3 — Módulos CRM funcionales (5 h)
- **Dashboard** con KPIs reales (conteos API), gráficos SVG, filtros fecha/equipo/responsable.
- **Contactos / Empresas**: listado server-side, búsqueda, filtros, columnas configurables, ficha, edición, relaciones, stream.
- **Leads**: listado, ficha, conversión a contacto/oportunidad (`/Lead/action/convert`).
- **Oportunidades**: listado + **Kanban** con DnD que persiste `stage`, totales por columna, ficha, probabilidad, importe, fecha de cierre.
- **Actividades**: tareas/llamadas/reuniones, completar, relacionar.
- **Calendario**: mes/semana, crear actividad.
- **Búsqueda global** (`GlobalSearch`).

### Fase 4 — Auth, permisos y administración (2 h)
- Login/logout, refresco de token, expiración, 401 global.
- ACL: navegación y acciones según `acl` de `App/user`; probar con usuario restringido.
- **Usuarios / Equipos / Roles**: listados y asignación; roles en solo lectura + enlace a UI nativa.
- **Preferencias** de usuario (idioma, zona horaria, tema).
- **Campos personalizados**: lector de metadata; alta vía UI nativa (documentado).
- **Integraciones / WhatsApp / Email / Facebook / Instagram / Automatizaciones**: visibles como *Pendiente*, sin simular.

### Fase 5 — Pruebas y rendimiento (2 h)
- E2E: login, CRUD contacto, crear oportunidad, mover en Kanban, cerrar tarea, logout.
- Verificación cruzada API ↔ UI (mismos datos tras recarga).
- Prueba de permisos con usuario limitado (403 backend).
- Medición `docker stats` en reposo y con carga; informe CPU/RAM.
- Backup + restauración real en BD temporal.

### Fase 6 — Documentación y entrega (1 h)
- `README.md`, arquitectura, instalación, operaciones (backup/restore/upgrade/rollback), seguridad/licencias, informe de recursos.
- Script `deploy.sh` idempotente y `Makefile`.
- Entrega de credenciales por archivo seguro en el servidor (nunca en el repositorio).

---

## 6. Matriz funcional (alcance fase 1)

| Módulo | Backend real | Estado |
|---|---|---|
| Dashboard / KPIs | `/api/v1/{Contact,Lead,Opportunity,Task}` + agregación | ✅ Implementado |
| Contactos / Empresas | CRUD + búsqueda + relaciones + stream | ✅ |
| Leads | CRUD + conversión | ✅ |
| Oportunidades + Pipeline | CRUD + Kanban DnD + etapas | ✅ |
| Actividades | CRUD + completar | ✅ |
| Calendario | CRUD actividades | ✅ |
| Búsqueda global | `/api/v1/GlobalSearch` | ✅ |
| Usuarios / Equipos | lectura + asignación | ✅ |
| Roles / permisos | lectura ACL + enlace admin | ✅ (edición en UI nativa) |
| Preferencias | lectura/escritura | ✅ |
| Informes comerciales | agregación de oportunidades | ✅ básico |
| Campos personalizados | metadata + render dinámico | ✅ lectura; alta en UI nativa |
| Email / bandeja | arquitectura definida | ⏳ Pendiente (requiere cuentas) |
| WhatsApp / FB / IG | arquitectura definida | ⏳ Pendiente |
| Automatizaciones | requiere Advanced Pack (pago) | ⛔ No disponible |
| Import/Export | API/nativa según soporte | ⏳ Verificar |
| Webhooks | n8n opcional | ⏳ Diseño documentado |

Los módulos pendientes se muestran **deshabilitados con etiqueta "Pendiente"**; no se simulan datos ni acciones.

---

## 7. Seguridad, backups y rollback

### Seguridad
- HTTPS obligatorio (Caddy), HSTS, TLS moderno.
- Secretos en `.env` 600 y `secrets/`; nunca en Git ni en el bundle del navegador.
- Sin puertos de BD/EspoCRM expuestos; solo `127.0.0.1:8090`.
- Cabeceras: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`.
- Rate limit en `/api/v1/App/user` (login) y tamaño máximo de body.
- Token en `sessionStorage` (no `localStorage` persistente), rotación al re-login, logout revoca token local.
- Backend ACL siempre autoritativo; la UI solo refleja permisos.
- Logs Docker rotados (10 MB × 3); auditoría vía Stream de EspoCRM.
- Actualizaciones: tags fijos + backup previo + ventana + rollback documentado.

### Backup (cron 03:15 America/Costa_Rica)
- `mariadb-dump --single-transaction --routines --triggers` comprimido.
- `tar` de `data/` (adjuntos, config, logs) y `custom/` + `client/custom/`.
- Copia de `.env`, `docker-compose.yml`, `nginx/`.
- Retención 7 diarios / 4 semanales / 3 mensuales; verificación semanal de integridad.
- Restauración documentada y **probada** en BD temporal.

### Rollback
- **ERPNext:** backup + compose conservados 30 días; restauración posible.
- **EspoCRM:** tag de imagen anterior + backup de BD; procedimiento en `docs/OPERACIONES.md`.
- **Caddy:** copia del Caddyfile antes de cada cambio; `caddy reload` y reversión inmediata.

---

## 8. Presupuesto de recursos (estimación y objetivo)

| Servicio | Límite | Esperado en reposo |
|---|---|---|
| `espocrm` (Nginx+PHP-FPM) | 768 MB | 180–280 MB |
| `espocrm-daemon` | 256 MB | 80–120 MB |
| `espocrm-db` (MariaDB) | 512 MB | 220–320 MB |
| `web` (Nginx estático) | 64 MB | 10–15 MB |
| **Total stack MATMAX** | **1,6 GB** | **≈ 0,5–0,75 GB** |
| Resto del servidor (DeskComm, Supabase, Dockhand) | — | ≈ 4,2 GB |
| **Total previsto del host** | 7,8 GB | **≈ 4,9–5,3 GB** |

Conclusión honesta: el CRM cabe en 2 GB (incluso en ~0,75 GB), pero **el servidor completo no**, porque DeskComm/Supabase ya consumen ~3,2 GiB y quedan fuera del alcance. Se medirá y documentará el dato real.

---

## 9. Lo que necesito antes de ejecutar

1. **Autorización** para: backup + retirada de ERPNext (contenedores, volúmenes, imágenes, `/opt/erpnext`, `/opt/frappe_docker`), instalación de MATMAX y conmutación de Caddy.
2. **Acceso a la UI nativa de administración**:
   - A (recomendada): crear registro DNS `admin.crm.matmax.site` tipo A → `185.176.254.121`.
   - B: publicar en `https://crm.matmax.site:8443` (abrir 8443 en UFW).
   - C: solo túnel SSH (más incómodo para el día a día).
3. **Cuenta admin**: generaré contraseña fuerte y la dejaré en `/opt/matmax-crm/secrets/admin-credentials.txt` (600), no en el chat ni en Git. Si prefieres otra, indícalo.
4. **Correo**: si tienes SMTP/IMAP, pásalos; si no, se deja configurado y se activa después.
5. **Licencia**: confirmar si el producto se distribuirá comercialmente a terceros (afecta a AGPLv3).

---

## 10. Próxima acción inmediata

Tras tu autorización: **Fase 0 (backup verificado de ERPNext + retirada)** y **Fase 1 (instalación de EspoCRM 10.0.12 y smoke tests)**. No se tocará DeskComm, Supabase ni Dockhand.

> Nota: este plan se actualizará si cambia el entorno o si la validación de la imagen 10.1.x permite activar OAuth 2.0 + PKCE antes de lo previsto.

---

## 11. Estado de ejecución (actualizado 2026-11-11)

| Fase | Estado | Nota |
|---|---|---|
| Inspección del servidor | ✅ Completada | Inventario y riesgos documentados |
| Backup + retirada de ERPNext | ✅ Completada **sin backup** | Instrucción expresa del cliente; datos irrecuperables |
| Instalación EspoCRM 10.0.12 | ✅ Completada | MariaDB 11.8.9, PHP-FPM, Nginx, daemon, healthchecks; Costa Rica (CRC, UTC-6) y branding MATMAX |
| Rediseño SPA (Vue 3 + TS + Tailwind) | ✅ Completada | Login, dashboard, CRM, pipeline, actividades, calendario, informes, admin |
| Autenticación y permisos | ✅ Completada | Token por usuario, guards, ACL backend verificada |
| Módulos y pruebas E2E | ✅ Completada | CRUD, Kanban, permisos, móvil, nativo |
| Optimización y documentación | ✅ Completada | ~302 MB de RAM; backups y docs |
| Acceso administración | ✅ Operativo en `https://crm.matmax.site:8443` | DNS `admin.crm.matmax.site` opcional |
| Email / WhatsApp / Meta | ⏳ Pendiente de credenciales | Sin datos simulados |
| OAuth 2.0 | ⏳ Futuro | Requiere imagen EspoCRM 10.1.x |

**Cambio respecto al plan original:** por instrucción del cliente no se realizó backup de ERPNext. El sitio `crm.lapizzeria.food` se eliminó de forma irreversible. DeskComm/Supabase/Dockhand no se modificaron.
