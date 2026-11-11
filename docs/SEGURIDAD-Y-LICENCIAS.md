# Seguridad y licencias — MATMAX CRM

Última revisión: **11 de noviembre de 2026** · Producción: `https://crm.matmax.site`

---

## 1. Licencia de EspoCRM

MATMAX CRM usa **EspoCRM 10.0.12** como motor, bajo **GNU AGPLv3**.

Implicaciones:

- El código de EspoCRM y sus modificaciones deben seguir disponibles bajo AGPLv3.
- Si MATMAX CRM se ofrece como servicio de red, los usuarios deben poder acceder al código fuente correspondiente.
- Se conservan los avisos de copyright y la página legal `#About` / `LICENSE.txt`.
- El branding visible es MATMAX, pero **no se elimina la atribución legal**. Para retirarla haría falta una licencia comercial de EspoCRM.
- La SPA propia, la configuración y los scripts de MATMAX son desarrollos del cliente y no forman parte del código de EspoCRM.

La página `#About` está oculta de la navegación, pero sigue accesible para cumplir la licencia. El footer enlaza a **Licencias**.

---

## 2. Superficie expuesta

| Servicio | URL | Protección |
|---|---|---|
| CRM / SPA | `https://crm.matmax.site` | HTTPS, login, token de sesión |
| API EspoCRM | `https://crm.matmax.site/api/v1` | autenticación EspoCRM; sin sesión devuelve 401 |
| Administración nativa | `https://crm.matmax.site:8443` | HTTPS + login nativo |
| SSH | puerto 22 | clave SSH de root; acceso restringido |
| HTTP | puerto 80 | redirige a HTTPS |

Firewall UFW:

- 22/tcp
- 80/tcp
- 443/tcp
- 8443/tcp (administración nativa)

`admin.crm.matmax.site` queda como alias opcional pendiente de DNS. Mientras tanto, la administración se usa por `:8443`.

---

## 3. Autenticación y permisos

- El login de la SPA usa la API de EspoCRM y guarda el token en `sessionStorage`.
- La API se autentica con `Espo-Authorization: base64(usuario:token)` sin prefijo `Basic`.
- Los permisos de la SPA se calculan con el ACL de EspoCRM (`auth.can`).
- Roles:
  - **Admin:** configuración, usuarios, roles y entidades.
  - **Ventas:** contactos, empresas, leads, oportunidades, actividades y presupuestos.
- El rol **Ventas** tiene:
  - `CTreatment`: lectura del catálogo.
  - `CCQuote`: crear, leer y editar presupuestos de su equipo; sin borrado.
- Las entidades custom requieren permisos explícitos por rol. El usuario demo **comercial** está asignado al equipo **Comercial** y al rol **Ventas**; sus credenciales temporales están en `/opt/matmax-crm/secrets/comercial-credentials.txt` (600). Cambiar la contraseña al entregarlo o crear usuarios reales.

---

## 4. Credenciales y secretos

- `.env` en `/opt/matmax-crm/.env`, permisos `600`.
- Credenciales de admin en `/opt/matmax-crm/secrets/admin-credentials.txt`, permisos `600`.
- Bases de datos con contraseña root aleatoria.
- No se guardan contraseñas en el repositorio ni en la SPA.
- Recomendación: cambiar la contraseña inicial de admin y rotar credenciales si se comparten con terceros.

Nunca se deben incluir en Git:

- `.env`
- `.secrets/`
- backups
- `demo/`
- `web/dist`

---

## 5. Cabeceras y endurecimiento

Nginx/Caddy aplican:

- HTTPS obligatorio y HSTS.
- `X-Frame-Options: DENY`.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- CSP para la SPA y la API.
- `server_tokens off` en la UI nativa.
- Rate limit en el login de la SPA.
- Aislamiento de contenedores; MariaDB no expone puerto al host.
- PHP-FPM con límites de memoria y `date.timezone=America/Costa_Rica`.

La administración nativa no debe exponerse a Internet sin protección adicional; idealmente limitar `8443` por IP o usar VPN.

---

## 6. Datos personales

El CRM almacena datos de contactos, leads, empresas y actividades. El cliente es el **responsable del tratamiento**; MATMAX actúa como proveedor técnico.

Recomendaciones:

- Aplicar el principio de minimización: no pedir datos innecesarios.
- Definir una política de retención de leads y contactos inactivos.
- Atender solicitudes de acceso, rectificación y supresión.
- No exportar datos personales a canales no autorizados (WhatsApp personal, hojas sueltas, etc.).
- Revisar la normativa costarricense de protección de datos aplicable (Ley 8968 y regulación de la PRODHAB) con el asesor legal del cliente.

---

## 7. Backups

- Script: `/opt/matmax-crm/scripts/backup.sh`.
- Cron: `/etc/cron.d/matmax-backup`, diario a las **03:15 America/Costa_Rica**.
- Destino local: `/opt/matmax-crm/backups/`.
- Contenido:
  - `db.sql.gz` (MariaDB con rutinas, triggers y eventos).
  - `espocrm-data.tar.gz` (adjuntos y datos).
  - `espocrm-custom.tar.gz`.
  - `espocrm-custom-client.tar.gz`.
  - `.env`, `docker-compose.yml`, `nginx/`, `php/`, `scripts/`.
  - `SHA256SUMS`.
- Retención: 7 diarios, 4 semanales y 3 mensuales.
- Permisos: directorio `700`; `env.backup` `600`.
- Log: `/var/log/matmax-backup.log`.
- Verificación: `sha256sum -c SHA256SUMS`.

El backup vive en el mismo servidor. Para producción se debe replicar fuera del host y **cifrar la copia externa**, porque `env.backup` contiene secretos. Probar la restauración periódicamente; una copia no verificada no es una copia fiable.

---

## 8. Entidades custom y presupuestos

- `CTreatment` y `CCQuote` se crean con Entity Manager; no se modifica el núcleo.
- `setup-quotes.sh` es idempotente y crea entidades, campos y catálogo.
- `CCQuote` guarda líneas en `items` (JSON), totales e IDs de oportunidad/empresa/contacto.
- El rol Ventas tiene lectura del catálogo y CRUD de presupuestos de su equipo.
- Revisar los permisos de campo si se añaden datos sensibles al presupuesto.
- La vista imprimible `/quotes/:id/print` usa la sesión activa; no es pública.

---

## 9. Actualizaciones

- Fijar versiones de imágenes (`espocrm:10.0.12-fpm`, `mariadb:11.8.9`, `nginx:1.27-alpine`).
- Antes de actualizar: backup, revisar changelog, probar en staging y verificar extensiones/customizaciones.
- No actualizar directamente en producción sin ventana de mantenimiento.
- Las entidades custom y los campos se recrean con `setup-quotes.sh` si se migra a una instalación limpia.

---

## 10. Limitaciones conocidas

- `admin.crm.matmax.site` no resuelve por DNS; se usa `:8443`.
- El backup local no está cifrado ni replicado externamente por defecto.
- No hay MFA en la administración nativa.
- Las integraciones de email/WhatsApp/Meta no están conectadas.
- Los presupuestos no están firmados digitalmente; el PDF se genera desde la vista imprimible del navegador.
- El rol Ventas está configurado y existe el usuario demo **comercial**; los usuarios reales deben crearse y probarse antes de incorporarlos.

---

## 11. Contacto y responsabilidad

Para incidentes de seguridad:

1. No continuar usando credenciales comprometidas.
2. Revocar tokens/contraseñas.
3. Revisar logs de Nginx, Caddy y EspoCRM.
4. Restaurar desde un backup verificado si hay corrupción.
5. Documentar el incidente y las acciones tomadas.

La seguridad es un proceso continuo: revisar permisos, backups, logs y actualizaciones al menos una vez al mes.
