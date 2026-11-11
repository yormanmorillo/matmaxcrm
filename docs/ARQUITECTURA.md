# Arquitectura — MATMAX CRM

## 1. Visión general

```
Navegador
   │  HTTPS (Caddy, TLS + HSTS)
   ▼
Caddy :443  ──► 127.0.0.1:8090  (SPA)      ──► contenedor web (Nginx)
   │                                              ├── /            SPA Vue (estático)
   │                                              ├── /api/        FastCGI ─► espocrm:9000
   │                                              └── /oauth/      reservado 10.1
   └──► 127.0.0.1:8091 (admin nativa) ──► contenedor web (Nginx) ─► espocrm:9000
                                                   │
                                          red edge │ red db
                                                   ▼
                                            espocrm (PHP-FPM)
                                                   │
                                                   ▼
                                            MariaDB (sin puerto público)
```

Servicios del stack (`/opt/matmax-crm/docker-compose.yml`):

| Servicio | Contenedor | Función |
|---|---|---|
| `db` | `matmax-db` | MariaDB 11.8.9, volumen `matmax-crm_db-data` |
| `espocrm` | `matmax-app` | PHP-FPM + código oficial, volúmenes `data`, `custom`, `custom-client` |
| `daemon` | `matmax-daemon` | Cron de EspoCRM (`docker-daemon.sh`) |
| `web` | `matmax-web` | Nginx: SPA, API y UI nativa; imagen construida desde la FPM |

---

## 2. Flujo de una petición

1. El navegador pide `https://crm.matmax.site/`.
2. Caddy termina TLS y reenvía a `127.0.0.1:8090`.
3. Nginx del contenedor `web` sirve `index.html` y los assets con hash.
4. La SPA hace `fetch('/api/v1/...')` al mismo origen.
5. Nginx envía `/api/` a PHP-FPM (`espocrm:9000`) con `SCRIPT_FILENAME=/var/www/html/public/api/v1/index.php`.
6. EspoCRM resuelve la ruta, aplica autenticación y ACL, consulta MariaDB y responde JSON.
7. La SPA renderiza; nunca accede a MariaDB directamente.

La UI nativa se sirve desde el mismo contenedor `web` en el puerto 8081 (publicado solo en loopback `8091`), con `root=/var/www/html` y `try_files` hacia `public/index.php`. Caddy la publica en `admin.crm.matmax.site`.

---

## 3. Autenticación

EspoCRM 10.0.x no incluye OAuth 2.0 (llega en 10.1). Se usa el mecanismo oficial de token:

1. `GET /api/v1/App/user` con cabecera:
   ```
   Espo-Authorization: base64(usuario:contraseña)
   ```
   (sin el prefijo `Basic`; ese prefijo solo se usa en `Authorization`).
2. La respuesta incluye `token`, `user`, `acl` y `preferences`.
3. Las peticiones posteriores usan:
   ```
   Espo-Authorization: base64(usuario:token)
   ```
4. El token se guarda en `sessionStorage` (no en `localStorage` persistente), se pierde al cerrar la pestaña y se limpia al cerrar sesión.
5. Ante `401`, el cliente limpia la sesión y redirige a login.

**No se incluyen credenciales de administrador en el bundle.** El usuario se autentica con su propia cuenta y el backend aplica su ACL. La contraseña solo se usa en la petición de login y no se almacena.

### Migración futura a OAuth 2.0 + PKCE

Cuando la imagen 10.1.x esté publicada:

1. Registrar un cliente público en `Administración > OAuth Clients` con redirect `https://crm.matmax.site/auth/callback`.
2. Añadir flujo Authorization Code + PKCE en la SPA.
3. Mantener el mismo proxy `/oauth/` ya previsto en `nginx/spa.conf`.
4. Retirar el almacenamiento del token de sesión de EspoCRM.

---

## 4. Permisos (ACL)

- El backend de EspoCRM es la única autoridad. La UI **nunca** sustituye una comprobación de seguridad.
- `App/user` devuelve `acl.table[scope] = {read, edit, delete, create, stream}` con valores `all | team | own | no`.
- La SPA:
  - oculta módulos del sidebar sin `read`;
  - oculta botones de crear/editar/borrar sin permiso;
  - el guard de rutas redirige a `/forbidden` si falta lectura;
  - un `403` del backend se muestra como error, sin reintentos que evadan la ACL.
- Roles y equipos se crean/gestionan en EspoCRM. La pantalla de roles muestra la matriz en solo lectura y enlaza a la UI nativa para edición fina.

Prueba realizada con usuario `Ventas` + equipo `Comercial`:

| Acción | Resultado |
|---|---|
| Ver contactos/oportunidades del equipo | permitido |
| Ver registros de otro usuario | oculto |
| Editar etapa de una oportunidad del equipo | permitido |
| Borrar contacto | botón oculto y `DELETE` directo → 403 |
| Acceder a `/roles` | redirigido a 403 |
| Ver usuarios/equipos del equipo | permitido |

---

## 5. Frontend

### Estructura

- **Vue 3 + TypeScript + Vite**; build estático servido por Nginx. No hay Node en producción.
- **Tailwind CSS 4** con tokens semánticos (`canvas`, `surface`, `ink`, `brand`, etc.) y modo oscuro por clase.
- **Reka UI** para diálogos, drawers y menús accesibles.
- **Lucide** para iconografía.
- **Pinia** para auth, metadata, referencias y UI.
- **Vue Router** con guards de sesión/ACL.
- **vuedraggable/SortableJS** para el Kanban.
- Gráficos SVG propios (sin librería de charts).

### Formularios dirigidos por metadata

`RecordForm` lee `/api/v1/Metadata` y renderiza según el tipo de campo:

| Tipo | Componente |
|---|---|
| `varchar`, `email`, `phone`, `url` | input |
| `text` | textarea |
| `enum`, `foreign` | select con etiquetas en español |
| `link` | selector con búsqueda (`EntitySelect`) |
| `currency`, `int`, `float` | input numérico |
| `date`, `datetime` | input nativo |
| `bool` | toggle |

Los **campos personalizados** creados en Entity Manager se añaden automáticamente al formulario si no están ya en la configuración de la entidad. El listado y la ficha los leen de la misma metadata.

### Particularidad de Contacto

En EspoCRM 10, `Contact.title` **no es almacenable**: se deriva del rol del contacto en la relación con la empresa (`AccountContact.role`). Si el contacto no tiene empresa, el campo no persiste. La UI:
- deshabilita “Puesto” y muestra una ayuda hasta seleccionar una empresa;
- no envía el campo si no hay empresa, evitando pérdidas silenciosas.

### Listados

- Paginación y búsqueda **server-side** (`maxSize` 25, `offset`, `where textFilter`).
- Columnas configurables por entidad en `localStorage`.
- Filtro por responsable.
- Exportación CSV de hasta 200 registros (límite de la API).

### Timeline y próximas acciones

`RecordTimeline` combina el stream del registro, actividades (tareas, llamadas y reuniones) y oportunidades relacionadas en una línea temporal única. Las actividades se consultan por `parentType`/`parentId` cuando el vínculo es un contacto y por `accountId` cuando es una empresa.

`useNextActions` carga actividades abiertas y calcula la acción más próxima por oportunidad, usando el contacto como prioridad y la empresa como respaldo. El pipeline muestra la acción, su fecha y si está atrasada, y permite filtrar por estado de la acción.

### Tratamientos y presupuestos

EspoCRM core no incluye `Quote`/`Product`. Se crearon entidades custom mediante Entity Manager:

- `CTreatment`: nombre, categoría, precio, duración y activo.
- `CCQuote`: estado, validez, IVA, subtotal, impuesto, total, líneas JSON y referencias denormalizadas `opportunityId`, `accountId`, `contactId` (con nombres para listados).

La SPA edita las líneas y calcula los totales; se guardan en `items` como JSON. `infra/scripts/setup-quotes.sh` crea las entidades, campos y catálogo inicial de forma idempotente. No se modifica el núcleo. La ruta `/quotes/:id/print` genera la vista imprimible con `window.print()` (Guardar como PDF). El rol **Ventas** tiene lectura del catálogo y CRUD de presupuestos; las entidades custom requieren permisos por rol para usuarios no administradores.

### Vistas guardadas

`useSavedViews` persiste por usuario y navegador en localStorage. Pipeline guarda búsqueda, responsable y filtro de acción; los listados guardan además las columnas visibles. Para compartir vistas entre dispositivos/equipo habría que moverlas a una entidad custom.

### Conversión de leads

La ficha del lead ofrece un asistente que usa el endpoint oficial `POST /Lead/action/convert` con `records` de Empresa, Contacto y Oportunidad. Se prellenan desde `getConvertAttributes`, se valida en cliente y el backend aplica detección de duplicados (`409`); el usuario puede revisar los duplicados o continuar explícitamente. El lead queda en estado `Converted` y se enlazan los tres registros.

### Kanban

- Etapas desde la metadata de `Opportunity.stage`; cada tarjeta muestra **persona de contacto**, empresa, importe, probabilidad, responsable y cierre.
- Drag & drop con `vuedraggable`; al soltar se hace `PATCH /Opportunity/{id}` con la nueva etapa.
- Actualización optimista; si el backend falla, se revierte y se recarga.
- Respeta `edit`: si no hay permiso, el tablero no permite arrastrar.

### Búsqueda global

- `GET /api/v1/GlobalSearch?q=...&maxSize=20`.
- Command palette con `Ctrl/Cmd + K`, navegación por teclado y accesos directos.

---

## 6. Datos y volúmenes

| Volumen | Contenido | Backup |
|---|---|---|
| `matmax-crm_db-data` | MariaDB | dump SQL |
| `matmax-crm_espocrm-data` | configuración, adjuntos, logs | tar |
| `matmax-crm_espocrm-custom` | extensiones/customizaciones PHP | tar |
| `matmax-crm_espocrm-custom-client` | JS/CSS de customizaciones | tar |

No se monta el código completo en un volumen: el código vive en la imagen (inmutable) y solo se persisten datos/customizaciones. Esto evita que una actualización sobrescriba archivos del usuario y permite reconstruir el contenedor desde la imagen.

---

## 7. Decisiones y por qué

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Imagen oficial FPM + Nginx propio | Imagen Apache por defecto | Cumple Nginx + PHP-FPM y reduce memoria; el código sigue siendo el oficial |
| Copiar código en la imagen web | Montar el código desde un volumen | Inmutable, reproducible y con la misma versión exacta que la FPM |
| Token de EspoCRM en `sessionStorage` | Guardar contraseña o API key en el navegador | No expone credenciales de admin; permisos por usuario |
| Sin Redis/websocket/Elasticsearch | Stack “completo” de EspoCRM | Presupuesto de RAM; no son necesarios para el alcance actual |
| Sin Node en producción | SSR o servidor Node | El SPA compilado se sirve estático; menos superficie y RAM |
| Metadata dinámica | Formularios hardcodeados | Soporta campos personalizados sin tocar código |
| Edición de roles en UI nativa | Reimplementar Entity Manager | Evita duplicar una funcionalidad compleja y mantener compatibilidad |
| Caddy en el host | Nginx en el host | Ya existía y gestiona TLS de varios dominios; no se duplica |

---

## 8. Limitaciones conocidas

- **API `maxSize` 200:** dashboard, pipeline e informes cargan como máximo 200 oportunidades. Para volúmenes mayores se necesitará agregación server-side o paginación específica.
- **Sin tiempo real:** no hay websocket; las vistas se actualizan al navegar/refrescar o tras una acción.
- **Contacto sin empresa:** `title` no se guarda (limitación del modelo de EspoCRM).
- **Roles:** edición fina solo en la UI nativa.
- **Comunicación:** canales pendientes; no hay datos simulados.
- **Automatizaciones:** Advanced Pack de pago o n8n externo.
- **OAuth 2.0:** disponible cuando se publique la imagen 10.1.x.
- **Admin nativa:** pendiente del DNS `admin.crm.matmax.site`.

---

## 9. Referencias

- [Instalación](INSTALACION.md)
- [Operaciones](OPERACIONES.md)
- [Seguridad y licencias](SEGURIDAD-Y-LICENCIAS.md)
- [Informe de recursos](INFORME-RECURSOS.md)
- [Pruebas](PRUEBAS.md)
