# MATMAX CRM

CRM profesional autoalojado: **EspoCRM 10.0.12** como motor + **SPA propia en Vue 3 + TypeScript + Tailwind** para la experiencia de usuario.

- **Producción:** <https://crm.matmax.site>
- **Administración nativa:** <https://crm.matmax.site:8443> (el subdominio `admin.crm.matmax.site` se activará al crear el DNS A)
- **Servidor:** `185.176.254.121` · Ubuntu 24.04.5 · Docker 29.1.3 · Caddy 2.6.2

> **Estado:** instalación, rediseño, autenticación, permisos, pipeline, backups y pruebas E2E completados. Administración nativa operativa en `:8443`; el subdominio `admin.crm.matmax.site` queda como mejora opcional de DNS. Configuración regional: **Costa Rica (America/Costa_Rica, CRC ₡)**.

---

## 1. Stack

| Capa | Tecnología |
|---|---|
| Motor CRM | EspoCRM `10.0.12` (imagen oficial `-fpm`), rebrandeado como MATMAX CRM |
| Base de datos | MariaDB `11.8.9` (sin puerto público) |
| Backend web | PHP-FPM 8.4 dentro del contenedor oficial |
| Servidor web / proxy | Nginx `1.27` (contenedor `matmax-web`) + Caddy 2.6 en el host |
| Frontend | Vue 3.5 · TypeScript 5.9 · Vite 7 · Tailwind 4 · Reka UI |
| Región | Costa Rica · `America/Costa_Rica` · CRC (₡) |
| Autenticación | Token oficial del motor (`Espo-Authorization`) por usuario |
| TLS | Caddy (Let's Encrypt) + HSTS |
| Backups | `mariadb-dump` + volúmenes, cron 03:15 America/Costa_Rica |

Sin Redis, sin Elasticsearch, sin websocket y sin Node en producción. Presupuesto real del stack: **~300–350 MB de RAM en reposo**.

---

## 2. Estructura del repositorio

```
.
├── web/                       # SPA Vue 3 + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/        # UI, layout y CRM
│   │   ├── views/             # dashboard, contactos, pipeline, admin…
│   │   ├── stores/            # auth, metadata, referencias, UI
│   │   ├── lib/               # API, sesión, formato, constantes
│   │   └── router/
│   └── package.json
├── infra/                     # despliegue en el servidor
│   ├── docker-compose.yml
│   ├── docker/web/Dockerfile  # nginx + código oficial de EspoCRM
│   ├── nginx/                 # vhosts SPA y admin nativa
│   ├── php/                   # tuning PHP-FPM/OPcache
│   ├── scripts/backup.sh
│   ├── caddy/Caddyfile.example
│   └── .env.example
├── docs/                      # arquitectura, operaciones, seguridad, pruebas
├── tests/                     # pruebas E2E Playwright
├── deploy.sh
└── README.md
```

---

## 3. Funcionalidad

### Conectada al backend

- Login/logout con token, guard de rutas y expiración de sesión.
- Dashboard con KPIs reales, pipeline por etapa, win rate, tendencia mensual, tareas, actividad reciente y filtros por periodo, equipo y responsable.
- Contactos, empresas, leads y oportunidades: listado server-side, búsqueda, filtros, columnas configurables, paginación, ficha, creación, edición y borrado. Oportunidades muestran **contacto y empresa**.
- Pipeline Kanban con drag & drop que persiste la etapa vía API, mostrando **contacto, empresa, importe, responsable, cierre, próxima acción y alertas de vencimiento**.
- **Conversión de lead** a empresa + contacto + oportunidad con prellenado, validación y detección de duplicados.
- **Timeline 360°** por contacto, empresa, lead y oportunidad: notas, historial, actividades y oportunidades en un solo hilo.
- **Vistas guardadas** por usuario en pipeline y listados (búsqueda, responsable, acción y columnas).
- **Catálogo de tratamientos** y **presupuestos** con líneas, cantidades, IVA 13%, total en colones y **vista imprimible para Guardar como PDF**. Entidades custom `CTreatment` y `CCQuote`, sin tocar el núcleo.
- Actividades: tareas, llamadas y reuniones; crear y completar.
- Calendario mensual con actividades reales.
- Búsqueda global (`GlobalSearch`) y command palette (⌘K / Ctrl+K).
- Usuarios, equipos y roles: lectura, edición de usuario/equipos/roles, creación y borrado de equipos.
- Preferencias de perfil y tema claro/oscuro.
- Informes comerciales y exportación CSV.
- Campos personalizados leídos dinámicamente desde la metadata del motor.

### Deliberadamente pendiente (sin simulación)

- Bandeja omnicanal, WhatsApp, Facebook, Instagram y Email: arquitectura definida, sin canales conectados.
- Automatizaciones: requieren Advanced Pack (extensión de pago) o n8n externo.
- Edición fina de roles/Entity Manager: se realiza en la UI nativa de EspoCRM para no tocar el núcleo.

Los módulos pendientes se muestran con etiqueta **PRONTO** y una página explicativa; no hay datos ni botones falsos.

---

## 4. Acceso

### SPA

<https://crm.matmax.site>

Credenciales de administrador generadas en el servidor:

```bash
ssh root@185.176.254.121
cat /opt/matmax-crm/secrets/admin-credentials.txt
```

No se incluyen credenciales en este repositorio ni en el bundle del navegador.

### Administración nativa

Funciona ya en **<https://crm.matmax.site:8443>** (Caddy + UFW 8443), con el mismo usuario/contraseña.

Opcionalmente, para tener un hostname limpio, crea en tu DNS:

```
Tipo A · Host admin.crm.matmax.site · Valor 185.176.254.121 · TTL automático
```

Caddy emitirá el certificado automáticamente y el bloque ya está preparado. Mientras no exista el DNS, también puedes usar el túnel:

```bash
ssh -N -L 8091:127.0.0.1:8091 root@185.176.254.121
# abrir http://127.0.0.1:8091
```

---

## 5. Despliegue

```bash
# Requiere la clave SSH en .secrets/matmax_ed25519 (no se versiona)
./deploy.sh
```

El script compila la SPA, sincroniza `infra/` y `web/dist/`, ajusta permisos y ejecuta `docker compose up -d`. Para reconstruir la imagen web (cambio de versión del motor o del Dockerfile):

```bash
REBUILD=1 ./deploy.sh
```

Guía completa: [docs/INSTALACION.md](docs/INSTALACION.md).

---

## 6. Operación y backups

- Backup diario automático a las **03:15 America/Costa_Rica**.
- Retención: 7 diarios, 4 semanales, 3 mensuales.
- Verificación de integridad con SHA-256 y restauración probada (141 tablas).
- Ubicación: `/opt/matmax-crm/backups/` (permisos 700).

```bash
/opt/matmax-crm/scripts/backup.sh          # backup manual
docker compose -f /opt/matmax-crm/docker-compose.yml ps
docker stats --no-stream
```

Procedimientos de restauración, actualización y rollback: [docs/OPERACIONES.md](docs/OPERACIONES.md).

---

## 7. Documentación

| Documento | Contenido |
|---|---|
| [Plan técnico](docs/PLAN-TECNICO.md) | Inventario, riesgos y fases |
| [Instalación](docs/INSTALACION.md) | Despliegue reproducible desde cero |
| [Arquitectura](docs/ARQUITECTURA.md) | Componentes, autenticación, ACL y decisiones |
| [Operaciones](docs/OPERACIONES.md) | Backups, restauración, upgrades y rollback |
| [Seguridad y licencias](docs/SEGURIDAD-Y-LICENCIAS.md) | Controles, AGPLv3 y distribución comercial |
| [Configuración Costa Rica](docs/CONFIGURACION-COSTA-RICA.md) | Zona horaria, colón, teléfonos y direcciones |
| [Informe de recursos](docs/INFORME-RECURSOS.md) | Medición real de CPU/RAM y capacidad |
| [Pruebas](docs/PRUEBAS.md) | Matriz E2E, permisos y capturas |
| [Integraciones omnicanal](docs/INTEGRACIONES-OMNICANAL.md) | Modelo de conversaciones, canales y webhooks |
| [Demo Dental](docs/DEMO-DENTAL.md) | Carga y borrado de datos temporales |
| [Guía rápida visual (PDF)](docs/GUIA-RAPIDA-EMPLEADO.pdf) | Guía de 10 páginas con capturas para el equipo comercial |
| [Manual del empleado](docs/MANUAL-USUARIO.md) | Guía práctica detallada del usuario comercial |
| [Las dos interfaces](docs/MANUAL-USUARIO.md#10-las-dos-puertas-crm-y-administración) | CRM principal vs. administración nativa |

---

## 8. Advertencias importantes

1. **ERPNext fue retirado sin backup** por instrucción expresa del cliente. El sitio `crm.lapizzeria.food` y sus datos ya no existen. No hay copia de recuperación.
2. **Licencia:** EspoCRM es **AGPLv3**. Si MATMAX CRM se distribuye comercialmente como producto, hay que ofrecer el código fuente a los usuarios de red o adquirir una licencia comercial de EspoCRM. Revisar [Seguridad y licencias](docs/SEGURIDAD-Y-LICENCIAS.md).
3. **No se modifica el núcleo**: personalizaciones por API, Entity Manager y volúmenes `custom/`, `client/custom/`, `data/`. El branding visible es MATMAX; la página legal de licencias se conserva por AGPL.
4. **Entidades custom y permisos:** ejecutar `./scripts/setup-quotes.sh` tras una instalación limpia (crea Tratamientos/Presupuestos, catálogo inicial y permisos del rol Ventas).
5. **Demo temporal cargada:** cuenta **Dental Demo** con contactos, leads, oportunidades, actividades, tratamientos y presupuesto. Se elimina con `./scripts/cleanup-dental-demo.sh`. Ver [Demo Dental](docs/DEMO-DENTAL.md).
6. **Presupuesto de 2 GB:** el stack MATMAX cumple (~0,3 GB), pero el servidor completo no porque DeskComm + Supabase consumen ~3,2 GB y quedan fuera de este proyecto.

---

## 9. Licencia del proyecto

El código original de la SPA y la infraestructura de MATMAX se entrega para uso del cliente. Las licencias de componentes de terceros se detallan en [docs/SEGURIDAD-Y-LICENCIAS.md](docs/SEGURIDAD-Y-LICENCIAS.md).
