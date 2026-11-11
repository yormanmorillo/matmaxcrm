# Configuración regional — Costa Rica

MATMAX CRM está configurado para operar en **Costa Rica**.

## 1. Parámetros aplicados

| Parámetro | Valor |
|---|---|
| Zona horaria | `America/Costa_Rica` (UTC-6, sin horario de verano) |
| Moneda base | `CRC` — colón costarricense (₡) |
| Moneda por defecto | `CRC` |
| Lista de monedas | `CRC` |
| Formato de fecha | `DD/MM/YYYY` |
| Formato de hora | `HH:mm` (24 h) |
| Separador de miles | `.` |
| Separador decimal | `,` |
| Idioma nativo | Español (`es_ES`; no hay traducción `es_CR` específica) |
| Teléfonos demo | `+506` |
| Direcciones demo | San José, Heredia, Cartago, Pérez Zeledón |

La configuración se aplica en:

- **EspoCRM:** `Settings` (timeZone, defaultCurrency, baseCurrency, currencyList, currencyRates, dateFormat, timeFormat).
- **Contenedores:** `TZ` y `ESPOCRM_TIME_ZONE` en `docker-compose.yml`.
- **PHP:** `date.timezone` en `infra/php/zz-matmax.ini`.
- **Backups:** `CRON_TZ=America/Costa_Rica` en `/etc/cron.d/matmax-backup`.
- **SPA:** `web/src/lib/config.ts` (`es-CR`, `CRC`, `America/Costa_Rica`).

## 2. Formato de importes

- `₡9.500.000` para importes grandes.
- `₡32,2 M` en KPIs compactos del dashboard.
- La SPA usa `Intl.NumberFormat('es-CR', {currency:'CRC'})`.
- La administración nativa muestra CRC tras actualizar `Settings`.

## 3. Fechas y horas

- EspoCRM almacena datetime en UTC y devuelve `YYYY-MM-DD HH:mm:ss`.
- La SPA lo interpreta como UTC y lo muestra en `America/Costa_Rica`.
- El saludo del dashboard usa la hora de Costa Rica, no la del navegador.
- Los campos de fecha/hora se editan en hora de Costa Rica.

## 4. Datos demo

La cuenta **Dental Demo** está adaptada:

- Dirección: Avenida Central, Barrio Amón, San José, Costa Rica.
- Teléfonos: `+506 2222 0101` y móviles `+506 8810 12xx`.
- Importes en colones: implantología ₡9.500.000, ortodoncia ₡6.400.000, software ₡11.200.000, etc.
- Leads de San José, Heredia, Cartago y Pérez Zeledón.

Para recargar la demo con fechas actuales:

```bash
cd /opt/matmax-crm
./scripts/cleanup-dental-demo.sh
./scripts/demo-dental.sh
```

## 5. Notas

- No se aplican impuestos ni facturación fiscal; el CRM es comercial, no un sistema de facturación electrónica de Costa Rica.
- Si se requiere facturación electrónica (Hacienda), será una integración externa independiente.
- El país no está fijado por defecto en todos los formularios; los datos demo usan Costa Rica y la administración permite el catálogo de países.
