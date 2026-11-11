# Informe de recursos — MATMAX CRM

Medición real en producción: **2026-11-11**, servidor `vmi3740643` (185.176.254.121).

## 1. Resumen

| Indicador | Valor |
|---|---|
| RAM del stack MATMAX en reposo | **≈ 302 MB** (rango observado 300–351 MB) |
| CPU del stack en reposo | **≈ 0 %** (< 0,1 %; picos del cron) |
| RAM total del servidor | 7,8 GB (5,3 GB usados, 2,4 GB disponibles) |
| Swap | 4 GB (563 MB usados) |
| Disco | 96 GB (32 GB usados, **65 GB libres**) |
| Load average | 5,94 / 5,46 / 5,36 (4 vCPU) — presión de Supabase, no del CRM |
| Arranque estable | 8 h continuas con todos los healthchecks en verde |

**Conclusión:** el stack CRM cumple de sobra el presupuesto de 2 GB. El servidor completo **no** cumple 2 GB porque DeskComm + Supabase (fuera de alcance) consumen ~3,2 GB y elevan la carga de CPU.

---

## 2. Consumo por contenedor

| Contenedor | RAM | Límite | % límite |
|---|---:|---:|---:|
| `matmax-db` (MariaDB 11.8.9) | 201,7 MB | 512 MB | 39 % |
| `matmax-app` (PHP-FPM + EspoCRM) | 78,4 MB | 768 MB | 10 % |
| `matmax-daemon` (cron) | 14,8 MB | 256 MB | 6 % |
| `matmax-web` (Nginx + SPA) | 5,6 MB | 128 MB | 4 % |
| **Total** | **≈ 300,5 MB** | **1,66 GB** | **≈ 18 %** |

Durante la ejecución de un job de cron, el daemon puede subir temporalmente a ~100 MB y usar un núcleo durante unos segundos (pico observado 77 % de CPU). En reposo vuelve a ~15 MB y 0 %.

---

## 3. Contexto del servidor

| Servicio | RAM aproximada | ¿Alcance MATMAX? |
|---|---:|---|
| DeskComm + Supabase (14 contenedores) | ~3,2 GB | No |
| Dockhand | ~88 MB | No |
| ERPNext | **eliminado** | — |
| Caddy | ~28 MB | Infraestructura compartida |
| MATMAX CRM | ~302 MB | Sí |
| Sistema y caché | resto | — |

El Postgres de Supabase es el principal consumidor (2,4 GB RSS) y responsable del load average ~5–6. No se ha modificado.

---

## 4. Optimizaciones aplicadas

### MariaDB

- `innodb_buffer_pool_size=256M`
- `innodb_log_file_size=64M`
- `performance_schema=OFF` (ahorro relevante en MariaDB 11.8)
- `max_connections=50`, `table_open_cache=400`, `skip-name-resolve`
- Sin puerto publicado; tráfico solo por red interna.

### PHP-FPM / OPcache

- `pm=ondemand`, `pm.max_children=6`, `pm.process_idle_timeout=10s`
- `pm.max_requests=500` para reciclar workers.
- OPcache 96 MB, 20.000 archivos, revalidación 60 s.
- `memory_limit=256M`, subidas 50 MB.
- Logs de aplicación en nivel `WARNING`.

### Nginx / frontend

- SPA compilada y servida estática; **sin Node en producción**.
- Assets con hash y caché `immutable` 1 año.
- `index.html` sin caché.
- Compresión en Caddy (`zstd`/`gzip`).
- Bundle principal ~160 KB gzip; el chunk del Kanban (~69 KB gzip) se carga solo en `/pipeline`.
- Sin librería de gráficos (SVG propio), sin fuente externa (Inter self-hosted).

### Servicios evitados

- Sin Redis.
- Sin Elasticsearch.
- Sin websocket.
- Sin workers de Node.
- Sin contenedor de frontend Node.

---

## 5. Capacidad estimada

Con 2 vCPU y 2 GB dedicados solo al CRM:

- 10–20 usuarios concurrentes con uso normal (listados, fichas, pipeline) deberían ser suficientes.
- El límite práctico serán las consultas y el tamaño de la BD, no la RAM.
- Para > 20 usuarios o > 50.000 registros, revisar:
  - `maxSize` y agregaciones server-side,
  - índices de MariaDB,
  - buffer pool (subir a 512 MB–1 GB),
  - backups y retención.

En el servidor actual (compartido con Supabase), el margen disponible es ~2,4 GB. Es suficiente para el CRM, pero **no para un presupuesto global de 2 GB**.

---

## 6. Recomendaciones

1. **Si el requisito de 2 GB es del servidor completo**, mover DeskComm/Supabase a otro VPS o ampliar RAM a 16 GB.
2. Copiar backups a almacenamiento externo cifrado.
3. Monitorizar `docker stats`, `free -h` y `df -h` semanalmente.
4. Revisar el crecimiento de `matmax-crm_db-data` y de adjuntos.
5. Si se activan canales omnicanal o websocket, recalcular el presupuesto (añadirían 100–300 MB).
6. No añadir Redis/Elasticsearch sin justificar y medir.

---

## 7. Reproducir las mediciones

```bash
ssh root@185.176.254.121
docker stats --no-stream
free -h
df -h /
uptime
docker compose -f /opt/matmax-crm/docker-compose.yml ps
```
