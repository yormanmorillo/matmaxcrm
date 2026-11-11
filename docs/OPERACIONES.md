# Operaciones — MATMAX CRM

## 1. Accesos y credenciales

```bash
ssh root@185.176.254.121
cd /opt/matmax-crm
cat secrets/admin-credentials.txt      # usuario/contraseña admin
cat .env                               # secretos de BD (no compartir)
```

- SPA: <https://crm.matmax.site>
- Admin nativa: `https://crm.matmax.site:8443` (operativa; `admin.crm.matmax.site` opcional por DNS)
- Túnel admin: `ssh -N -L 8091:127.0.0.1:8091 root@185.176.254.121` → <http://127.0.0.1:8091>

Nunca copies `.env` ni `secrets/` a Git, chats o tickets.

---

## 2. Comandos habituales

```bash
cd /opt/matmax-crm

docker compose ps                       # estado y healthchecks
docker compose logs -f --tail=100 espocrm
docker compose logs -f --tail=100 daemon
docker compose logs -f --tail=100 web
docker stats --no-stream                # RAM/CPU real
docker compose restart web              # recargar Nginx/SPA
docker compose up -d                    # aplicar cambios de compose
docker compose down                     # parar (conserva volúmenes)
```

No uses `docker compose down -v` salvo que quieras borrar todos los datos.

Comprobaciones:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://crm.matmax.site/          # 200
curl -s -o /dev/null -w '%{http_code}\n' https://crm.matmax.site/api/v1/App/user  # 401
docker exec matmax-web wget -qO- http://127.0.0.1:8080/healthz             # ok
docker exec matmax-app bin/command app-check
```

---

## 3. Backups

### Automático

- Cron: `/etc/cron.d/matmax-backup`, diario a las **03:15 America/Costa_Rica**.
- Script: `/opt/matmax-crm/scripts/backup.sh`.
- Destino: `/opt/matmax-crm/backups/`.
- Retención: 7 diarios, 4 semanales (domingo), 3 mensuales (día 1).
- Cada backup incluye:
  - `db.sql.gz` (dump consistente con rutinas/triggers/eventos),
  - `espocrm-data.tar.gz`, `espocrm-custom.tar.gz`, `espocrm-custom-client.tar.gz`,
  - `.env`, `docker-compose.yml`, `nginx/`, `php/`, `scripts/`,
  - `SHA256SUMS`.
- Permisos: directorio 700, `env.backup` 600.
- Log: `/var/log/matmax-backup.log` (logrotate semanal, 8 copias).

### Manual

```bash
/opt/matmax-crm/scripts/backup.sh
ls -lh /opt/matmax-crm/backups/daily/
sha256sum -c /opt/matmax-crm/backups/daily/<FECHA>/SHA256SUMS
```

### Copia fuera del servidor (recomendado)

El backup actual vive en el mismo disco. Para producción, sincronízalo a almacenamiento externo:

```bash
rsync -az --delete root@185.176.254.121:/opt/matmax-crm/backups/ /ruta/segura/matmax-backups/
```

Cifra la copia externa (por ejemplo con `age` o `gpg`) porque `env.backup` contiene secretos.

---

## 4. Restauración

> Restaurar sobrescribe datos. Haz siempre un backup previo y avisa a los usuarios.

### 4.1 Restaurar solo la base de datos

```bash
cd /opt/matmax-crm
set -a; . ./.env; set +a
BACKUP=/opt/matmax-crm/backups/daily/2026-11-11_0511

# 1) Backup de seguridad del estado actual
./scripts/backup.sh

# 2) Parar aplicación y daemon (la BD sigue arriba)
docker compose stop espocrm daemon web

# 3) Restaurar
gunzip -c "${BACKUP}/db.sql.gz" \
  | docker exec -i -e MYSQL_PWD="${DB_ROOT_PASSWORD}" matmax-db \
      mariadb -uroot "${DB_NAME}"

# 4) Arrancar y verificar
docker compose start espocrm daemon web
docker compose ps
docker logs --tail=50 matmax-app
```

### 4.2 Restaurar volúmenes (adjuntos/config)

```bash
cd /opt/matmax-crm
BACKUP=/opt/matmax-crm/backups/daily/2026-11-11_0511
docker compose stop espocrm daemon web

docker run --rm \
  -v matmax-crm_espocrm-data:/data \
  -v "${BACKUP}":/backup:ro \
  alpine:3.20 sh -c 'rm -rf /data/* && tar xzf /backup/espocrm-data.tar.gz -C /data'

docker run --rm \
  -v matmax-crm_espocrm-custom:/data \
  -v "${BACKUP}":/backup:ro \
  alpine:3.20 sh -c 'rm -rf /data/* && tar xzf /backup/espocrm-custom.tar.gz -C /data'

docker run --rm \
  -v matmax-crm_espocrm-custom-client:/data \
  -v "${BACKUP}":/backup:ro \
  alpine:3.20 sh -c 'rm -rf /data/* && tar xzf /backup/espocrm-custom-client.tar.gz -C /data'

docker compose start espocrm daemon web
```

### 4.3 Prueba de restauración sin tocar producción

```bash
set -a; . ./.env; set +a
docker exec -e MYSQL_PWD="$DB_ROOT_PASSWORD" matmax-db mariadb -uroot \
  -e "DROP DATABASE IF EXISTS restore_test; CREATE DATABASE restore_test;"
gunzip -c backups/daily/<FECHA>/db.sql.gz \
  | docker exec -i -e MYSQL_PWD="$DB_ROOT_PASSWORD" matmax-db mariadb -uroot restore_test
docker exec -e MYSQL_PWD="$DB_ROOT_PASSWORD" matmax-db mariadb -uroot -N \
  -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='restore_test';"
docker exec -e MYSQL_PWD="$DB_ROOT_PASSWORD" matmax-db mariadb -uroot \
  -e "DROP DATABASE restore_test;"
```

Resultado verificado en la instalación: **141 tablas**.

---

## 5. Actualización de EspoCRM

1. **Backup** manual y verificación.
2. Anotar versión actual:
   ```bash
   docker inspect matmax-app --format '{{.Config.Image}}'
   ```
3. Editar `docker-compose.yml`:
   - `services.espocrm.image: espocrm/espocrm:<NUEVA>-fpm`
   - `services.daemon.image: espocrm/espocrm:<NUEVA>-fpm`
   - `services.web.build.args.ESPOCRM_VERSION: "<NUEVA>"`
   - `services.web.image: matmax-web:<NUEVA>`
4. Desplegar:
   ```bash
   docker compose build web
   docker compose pull espocrm daemon
   docker compose up -d
   docker logs -f matmax-app
   docker exec matmax-app bin/command app-check
   ```
5. Probar login, contactos, pipeline y admin nativa.
6. Si falla: volver a los tags anteriores y restaurar el backup si hubo migración de esquema.

**No** copies archivos del núcleo a `custom/` ni edites `application/`; las personalizaciones van por Entity Manager/extensiones.

---

## 6. Rollback

- **Aplicación:** cambiar tags a la versión anterior, `docker compose build web && up -d`.
- **Base de datos:** restaurar `db.sql.gz` previo a la migración.
- **Configuración:** restaurar `.env`, `nginx/`, `php/` desde el backup.
- **Caddy:** copia de seguridad `Caddyfile.bak-*`; `systemctl reload caddy`.

---

## 7. Administración nativa

### Acceso

La administración está operativa en `https://crm.matmax.site:8443`. Para un hostname limpio, crea el DNS:

```
admin.crm.matmax.site  A  185.176.254.121
```

Caddy emite el certificado automáticamente. Verificar:

```bash
dig +short admin.crm.matmax.site
curl -sI https://admin.crm.matmax.site | head
```

### Túnel mientras no hay DNS

```bash
ssh -N -L 8091:127.0.0.1:8091 root@185.176.254.121
# Abrir http://127.0.0.1:8091
```

### Uso

- Entity Manager: campos, layouts, relaciones.
- Roles y permisos: matriz fina por módulo/campo.
- Usuarios/equipos.
- Correo (IMAP/SMTP), integraciones, auditoría.
- No se modifica el núcleo.

---

## 8. Logs y salud

| Qué | Cómo |
|---|---|
| Aplicación | `docker logs matmax-app` |
| Daemon | `docker logs matmax-daemon` |
| Nginx | `docker logs matmax-web` |
| MariaDB | `docker logs matmax-db` |
| Caddy | `journalctl -u caddy -f` |
| Backups | `/var/log/matmax-backup.log` |
| EspoCRM | `docker exec matmax-app tail -100 data/logs/espo.log` |

Healthchecks: `docker compose ps` debe mostrar `(healthy)` en db, espocrm, daemon y web.

---

## 9. Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| 502 en `crm.matmax.site` | `matmax-web` caído o Caddy mal enrutado | `docker compose ps`, `docker logs matmax-web`, `curl 127.0.0.1:8090/healthz` |
| 403 en `theme-init.js` | permisos 600 tras rsync | `chmod -R a+rX /opt/matmax-crm/web/dist` |
| 400 “Max size should not exceed 200” | petición con `maxSize > 200` | usar `offset`/paginación |
| “Field validation failure… amount” | moneda no incluida en `currencyList` | revisar Settings > Moneda (CRC) |
| Puesto de contacto no se guarda | contacto sin empresa (campo derivado) | asignar empresa; la UI lo indica |
| 429 al hacer login | rate limit 30/min por IP | esperar o revisar `nginx/spa.conf` |
| Daemon con CPU alta puntual | ejecución de cron de EspoCRM | normal; comprobar `docker stats` en reposo |
| Admin no resuelve | falta DNS `admin` | crear registro A o usar túnel |
| BD llena | backups/adjuntos | `df -h`, limpiar backups antiguos, ampliar disco |

---

## 10. Nota sobre ERPNext

ERPNext fue eliminado por instrucción expresa **sin backup**. El sitio `crm.lapizzeria.food`, sus volúmenes e imágenes ya no existen. No hay rollback posible de ERPNext. DeskComm/Supabase/Dockhand no se tocaron.
