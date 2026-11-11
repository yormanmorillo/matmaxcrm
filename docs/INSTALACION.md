# Instalación reproducible — MATMAX CRM

Guía para desplegar una instalación nueva en un servidor Linux con Docker. La instalación actual está en `/opt/matmax-crm`.

---

## 1. Requisitos

| Recurso | Mínimo recomendado |
|---|---|
| CPU | 2 vCPU |
| RAM | 2 GB solo para el stack CRM (el servidor actual comparte otros servicios) |
| Disco | 20 GB libres |
| SO | Ubuntu 22.04/24.04 LTS |
| Software | Docker Engine 24+, Docker Compose v2, Caddy 2, rsync, openssl |
| Red | Puertos 80/443 abiertos; 22 para administración |

> El stack está dimensionado para ~300–350 MB en reposo. No incluye Redis, Elasticsearch ni websocket.

---

## 2. DNS

Crea estos registros `A` apuntando a la IP del servidor:

```
crm.matmax.site        A  <IP_DEL_SERVIDOR>
admin.crm.matmax.site  A  <IP_DEL_SERVIDOR>
```

Caddy obtiene y renueva los certificados TLS automáticamente. El dominio `desk.matmax.site` no forma parte de MATMAX CRM.

---

## 3. Estructura en el servidor

```bash
mkdir -p /opt/matmax-crm
# Copiar el contenido de infra/ a /opt/matmax-crm/
# La SPA compilada se publica en /opt/matmax-crm/web/dist/
```

Estructura resultante:

```
/opt/matmax-crm/
├── docker-compose.yml
├── .env                     # secretos, permisos 600
├── docker/web/Dockerfile
├── nginx/{spa,native}.conf
├── php/{zz-matmax.ini,zz-matmax-fpm.conf}
├── scripts/backup.sh
├── secrets/admin-credentials.txt
├── web/dist/                # build de Vue
└── backups/                 # generado por el cron
```

---

## 4. Variables de entorno y secretos

```bash
cd /opt/matmax-crm
umask 077

DB_ROOT_PASSWORD="$(openssl rand -hex 24)"
DB_PASSWORD="$(openssl rand -hex 24)"
ADMIN_PASSWORD="$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 20)"

cat > .env <<EOF
DB_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
DB_NAME=espocrm
DB_USER=espocrm
DB_PASSWORD=${DB_PASSWORD}
ADMIN_USERNAME=admin
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_EMAIL=admin@matmax.site
SITE_URL=https://crm.matmax.site
TZ=America/Costa_Rica
EOF

mkdir -p secrets
cat > secrets/admin-credentials.txt <<EOF
MATMAX CRM — credenciales de administrador
URL: https://crm.matmax.site
Usuario: admin
Password: ${ADMIN_PASSWORD}
Email: admin@matmax.site
Generado: $(date -Is)
EOF

chmod 600 .env secrets/admin-credentials.txt
chmod 700 secrets
```

`ADMIN_PASSWORD` solo se usa en la primera instalación. Si se cambia después en `.env`, **no** cambia la contraseña ya creada; se cambia desde la administración nativa.

Nunca se commitea `.env` ni `secrets/`.

---

## 5. Imágenes y versiones

| Servicio | Imagen | Notas |
|---|---|---|
| `espocrm` / `daemon` | `espocrm/espocrm:10.0.12-fpm` | PHP-FPM 8.4, código oficial |
| `db` | `mariadb:11.8.9` | Sin puerto publicado |
| `web` | `matmax-web:10.0.12` | Construida desde la imagen FPM + Nginx |

Digests de referencia (amd64, en la instalación actual):

```
espocrm/espocrm:10.0.12-fpm  sha256:8c6f37ff5bfc89fc4a1994a126f880019c388197bf9f2494547697265a57caef
mariadb:11.8.9               sha256:c4124d1afa875e47f2892edf26b482fa54f796e2f342d3717a04ca091a22a9bd
matmax-web:10.0.12           sha256:df6cbfd5d54ed6ea075f7b31a22345f1f089a8fe7cb7f8d8fb2ff485434da898
```

La imagen `matmax-web` copia el código de la **misma** imagen FPM y añade Nginx. No se modifica el núcleo: solo se sirve una copia inmutable y se montan configuraciones y el `dist` del SPA.

---

## 6. Arranque

> La SPA se compila en la máquina de desarrollo (`cd web && npm ci && npm run build`) y se copia a `/opt/matmax-crm/web/dist/`. No se necesita Node en el servidor de producción; `./deploy.sh` automatiza ambos pasos.

```bash
cd /opt/matmax-crm
docker compose config          # validar
docker compose build web       # construye nginx + código EspoCRM
docker compose up -d           # arranca db, app, daemon y web
docker compose ps              # esperar healthy
docker logs matmax-app | tail -40
```

La primera vez, EspoCRM ejecuta la instalación automática (crea esquema, admin y trabajos programados). Puede tardar 1–2 minutos.

Después, crea las entidades custom de tratamientos/presupuestos y su catálogo inicial:

```bash
./scripts/setup-quotes.sh
```

Es idempotente: si ya existen, no modifica datos.

---

## 7. Caddy

Integra los bloques de [`infra/caddy/Caddyfile.example`](../infra/caddy/Caddyfile.example) en `/etc/caddy/Caddyfile`:

```bash
cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak
# editar /etc/caddy/Caddyfile y añadir crm + admin
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

La configuración actual del servidor también mantiene el bloque preexistente de `desk.matmax.site`; no se ha modificado.

---

## 8. Firewall

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

MariaDB (3306) y EspoCRM (9000) no se publican. La SPA escucha en `127.0.0.1:8090` y la UI nativa en `127.0.0.1:8091`.

---

## 9. Verificación

```bash
# SPA y TLS
curl -sI https://crm.matmax.site/ | head

# API sin auth debe devolver 401
curl -s -o /dev/null -w '%{http_code}\n' https://crm.matmax.site/api/v1/App/user

# Login de administrador
cd /opt/matmax-crm
set -a; . ./.env; set +a
AUTH="$(printf '%s:%s' "$ADMIN_USERNAME" "$ADMIN_PASSWORD" | base64 -w0)"
curl -s -H "Espo-Authorization: $AUTH" https://crm.matmax.site/api/v1/App/user \
  | jq '{user: .user.userName, tokenLen: (.token|length)}'

# Salud de contenedores
docker compose ps
docker stats --no-stream
```

Prueba de interfaz: abrir `https://crm.matmax.site`, iniciar sesión y crear un contacto.

---

## 10. Backups y cron

```bash
chmod 755 /opt/matmax-crm/scripts/backup.sh
/opt/matmax-crm/scripts/backup.sh

cat > /etc/cron.d/matmax-backup <<'EOF'
CRON_TZ=America/Costa_Rica
15 3 * * * root /opt/matmax-crm/scripts/backup.sh >> /var/log/matmax-backup.log 2>&1
EOF
chmod 644 /etc/cron.d/matmax-backup
```

Ver [OPERACIONES.md](OPERACIONES.md) para restauración y retención.

---

## 11. Administración nativa

La administración está disponible en **https://crm.matmax.site:8443** (UFW 8443 + Caddy). Opcionalmente, con el DNS `admin.crm.matmax.site`, Caddy la publica también en ese hostname.

Alternativa por túnel:

```bash
ssh -N -L 8091:127.0.0.1:8091 root@185.176.254.121
# http://127.0.0.1:8091
```

---

## 12. Actualización de versión

1. Ejecutar backup manual.
2. Cambiar el tag en `docker-compose.yml` (`espocrm`, `daemon`, `args.ESPOCRM_VERSION`, `image` de `web`).
3. `docker compose build web && docker compose pull && docker compose up -d`.
4. Revisar `docker logs matmax-app`, `bin/command app-check` y la UI.
5. Rollback: volver al tag anterior y, si hubo migración de esquema, restaurar el backup previo.

---

## 13. Notas de esta instalación

- ERPNext fue retirado **sin backup** por instrucción expresa; no hay recuperación posible del sitio `crm.lapizzeria.food`.
- DeskComm, Supabase y Dockhand no se han modificado.
- La UI nativa queda pendiente del DNS admin; el resto está operativo.
