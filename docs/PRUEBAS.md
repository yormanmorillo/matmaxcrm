# Pruebas — MATMAX CRM

Fecha: **2026-11-11** · Entorno: producción `https://crm.matmax.site` · Navegador: Chromium headless (Playwright 1.65).

La suite limpia los registros que crea. La cuenta **Dental Demo** es una carga temporal independiente para demostración; se elimina con `./scripts/cleanup-dental-demo.sh`.

---

## 1. Resultados E2E

### Smoke / navegación

| Caso | Resultado |
|---|---|
| Login con credenciales reales | ✅ |
| Redirección a dashboard | ✅ |
| Dashboard carga KPIs y gráficos | ✅ |
| Contactos, pipeline, oportunidades, usuarios, preferencias | ✅ |
| Módulo pendiente (`/pending/whatsapp`) | ✅ |
| Tema oscuro persistente | ✅ |
| Sin errores de consola ni HTTP 4xx/5xx | ✅ |

### CRUD y pipeline

| Caso | Resultado |
|---|---|
| Crear contacto desde la SPA | ✅ |
| Búsqueda instantánea del contacto | ✅ |
| Abrir ficha y ver datos | ✅ |
| Editar email y persistir | ✅ |
| Borrar contacto con confirmación | ✅ |
| Crear oportunidad desde pipeline | ✅ |
| Arrastrar tarjeta Prospección → Negociación | ✅ |
| Etapa persistida en backend (`stage=Negotiation`) | ✅ |
| Borrar oportunidad | ✅ |
| Búsqueda global (⌘K) con resultado | ✅ |

### Módulos

| Caso | Resultado |
|---|---|
| Ficha de empresa y pestaña Contactos (con datos demo) | ✅ |
| Ficha de lead (con datos demo) | ✅ |
| Ficha de oportunidad (con datos demo) | ✅ |
| Crear tarea con contacto (`parentType=Contact`) | ✅ |
| Convertir lead → empresa + contacto + oportunidad | ✅ |
| Próxima acción y vencimiento en tarjetas del pipeline | ✅ |
| Filtro de pipeline por acción atrasada | ✅ |
| Timeline 360° en contacto, empresa y oportunidad | ✅ |
| Vistas guardadas de pipeline y listados | ✅ |
| Catálogo de tratamientos (CRUD) | ✅ |
| Presupuesto con líneas, IVA y total | ✅ |
| Presupuesto visible en la oportunidad | ✅ |
| Vista imprimible / Guardar PDF | ✅ |
| Acceso con usuario comercial (rol Ventas) | ✅ |
| Actividades de contacto muestran llamadas/reuniones por `parentType` | ✅ |
| Detección de duplicados en conversión (409) | ✅ |
| Completar tarea → `Completed` en backend | ✅ |
| Crear reunión desde calendario | ✅ |
| Informes comerciales y tablas | ✅ |
| Campos personalizados (metadata) | ✅ |
| Administración (enlaces y estado) | ✅ |
| Menú móvil (390×844) | ✅ |
| Crear y eliminar equipo | ✅ |

### Permisos (usuario temporal `Ventas` + equipo `Comercial`)

| Caso | Resultado |
|---|---|
| Login del usuario limitado | ✅ |
| Sidebar oculta Roles/Administración | ✅ |
| Ve contactos del equipo, no los de otro usuario | ✅ |
| No ve oportunidades de otro usuario | ✅ |
| Botón de borrar oculto | ✅ |
| `DELETE` directo a la API | ✅ **403** |
| Ruta `/roles` | ✅ redirige a 403 |
| Edita etapa de una oportunidad del equipo | ✅ |
| Limpieza de usuario y registros | ✅ |

### UI nativa de administración

Probada en `https://crm.matmax.site:8443`: login, dashboard, Entity Manager, roles, usuarios, moneda, correo e integraciones responden sin errores. El subdominio `admin.crm.matmax.site` queda como mejora opcional de DNS.

### Backups

| Caso | Resultado |
|---|---|
| Backup manual | ✅ 60 KB DB + 340 KB volúmenes |
| Checksums SHA-256 | ✅ |
| Restauración en BD temporal | ✅ 141 tablas |
| Cron diario | ✅ instalado 03:15 America/Costa_Rica |
| Retención 7/4/3 | ✅ implementada |

---

## 2. Capturas

> Las capturas 10–24 se tomaron durante las pruebas funcionales con el dataset anterior. Las capturas 31 y 32 reflejan la configuración final de Costa Rica (CRC, +506, zona horaria CR) y el branding MATMAX.

| Archivo | Pantalla |
|---|---|
| `screenshots/01-login.png` | Login |
| `screenshots/02-dashboard.png` | Dashboard con Dental Demo |
| `screenshots/03-contacts.png` | Contactos con Dental Demo |
| `screenshots/04-pipeline.png` | Pipeline con Dental Demo |
| `screenshots/05-opportunities.png` | Oportunidades con Dental Demo |
| `screenshots/06-users.png` | Usuarios |
| `screenshots/07-settings.png` | Preferencias |
| `screenshots/08-pending.png` | Módulo pendiente |
| `screenshots/09-dashboard-dark.png` | Modo oscuro |
| `screenshots/10-contact-detail.png` | Ficha de contacto |
| `screenshots/11-pipeline-created.png` | Oportunidad creada |
| `screenshots/12-pipeline-drag.png` | Kanban tras arrastrar |
| `screenshots/13-global-search.png` | Búsqueda global |
| `screenshots/14-qa-contacts.png` | Contactos visibles para QA |
| `screenshots/15-qa-forbidden.png` | 403 por permisos |
| `screenshots/16-qa-kanban.png` | Kanban del usuario limitado |
| `screenshots/17-account-detail.png` | Ficha de empresa |
| `screenshots/18-lead-detail.png` | Ficha de lead |
| `screenshots/19-opportunity-detail.png` | Ficha de oportunidad |
| `screenshots/20-activities.png` | Actividades |
| `screenshots/21-calendar.png` | Calendario |
| `screenshots/22-reports.png` | Informes |
| `screenshots/23-mobile-dashboard.png` | Dashboard móvil |
| `screenshots/24-mobile-sidebar.png` | Menú móvil |
| `screenshots/27-native-login-matmax.png` | Login nativo MATMAX |
| `screenshots/28-native-admin-matmax.png` | Administración nativa MATMAX |
| `screenshots/29-native-entity-manager.png` | Entity Manager |
| `screenshots/31-spa-costa-rica.png` | Dashboard en colones (CRC) |
| `screenshots/33-convert-lead.png` | Asistente de conversión de lead |
| `screenshots/34-lead-converted.png` | Lead convertido con enlaces |
| `screenshots/35-convert-duplicate.png` | Detección de duplicados en conversión |
| `screenshots/36-contact-timeline.png` | Timeline 360° de contacto |
| `screenshots/37-opportunity-timeline.png` | Timeline de oportunidad |
| `screenshots/38-account-timeline.png` | Timeline de empresa |
| `screenshots/39-contact-activities.png` | Actividades del contacto (tareas, llamadas y reuniones) |
| `screenshots/40-pipeline-overdue.png` | Pipeline filtrado por acción atrasada |
| `screenshots/41-saved-view-pipeline.png` | Vista guardada del pipeline |
| `screenshots/42-saved-view-list.png` | Vista guardada de oportunidades |
| `screenshots/43-treatments.png` | Catálogo de tratamientos |
| `screenshots/45-quote-editor.png` | Editor de presupuesto |
| `screenshots/46-quotes-list.png` | Listado de presupuestos |
| `screenshots/47-opportunity-quotes.png` | Presupuestos en la oportunidad |
| `screenshots/48-quote-print.png` | Presupuesto imprimible |
| `screenshots/49-sales-user-quotes.png` | Presupuestos vistos por el usuario comercial |
| `screenshots/50-sales-dashboard.png` | Dashboard del usuario comercial |
| `screenshots/51-sales-pipeline.png` | Pipeline del usuario comercial |
| `screenshots/32-native-costa-rica.png` | Oportunidades nativas en CRC |

---

## 3. Cómo reproducir

```bash
cd tests
npm install
npx playwright install chromium

export ADMIN_USER=admin
export ADMIN_PASS='...'   # /opt/matmax-crm/secrets/admin-credentials.txt

npm run smoke
npm run crud
npm run modules
npm run permissions
npm run team
```

`ui-permissions` requiere el rol **Ventas** y el equipo **Comercial** (ya creados). Crea y elimina sus propios registros.

---

## 4. Incidencias encontradas y corregidas

| Incidencia | Corrección |
|---|---|
| API `maxSize` > 200 devolvía error y vaciaba el dashboard | límite 200 en todas las consultas |
| `Contact.title` no persistía sin empresa | campo deshabilitado + ayuda; se envía solo con empresa |
| Fechas UTC mostradas como locales (“dentro de 5 horas”) | parseo UTC y conversión local al guardar |
| `403` en `theme-init.js` por permisos 600 | `chmod a+rX` en el deploy |
| Modal de confirmación detrás del overlay del drawer | capas z-index explícitas (`layer`) |
| Tareas sin `status` → 400 | defaults por entidad (Task/Call/Meeting/Lead/Opportunity) |
| Tests dependían de datos demo | tests autocontenidos / condicionales |
| Imagen Apache de EspoCRM sin usar | eliminada |

---

## 5. Limitaciones de las pruebas

- No se probó con 10–20 usuarios concurrentes reales; la estimación es de capacidad, no una prueba de carga.
- No se probaron envío/recepción de email (sin credenciales SMTP/IMAP).
- No se probaron integraciones WhatsApp/Meta (sin tokens).
- El drag & drop se probó en Chromium de escritorio; el soporte táctil depende de SortableJS y no se probó en dispositivos reales.
- La restauración de volúmenes se documentó y se validó el tar, pero no se sobrescribió producción.
- `admin.crm.matmax.site` no se probó públicamente por falta de DNS; sí por túnel.
