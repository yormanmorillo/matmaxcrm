# Demo temporal — Dental Demo

Carga de datos de demostración para validar la interfaz con información realista. **No son datos reales** y se pueden eliminar en cualquier momento.

## Contenido

- **Cuenta:** Dental Demo (sector Healthcare, tres sedes en San José, Heredia y Cartago, Costa Rica).
- **Contactos:** 4 (dirección médica, gerencia, recepción y ortodoncia).
- **Leads:** 4 con estados New / In Process / Assigned / Recycled.
- **Oportunidades:** 6 (4 abiertas, 1 ganada, 1 perdida) repartidas por el pipeline, en colones (CRC).
- **Tareas:** 5 (4 pendientes, 1 completada; una vencida para demostrar alertas).
- **Tratamientos:** 6 en el catálogo inicial.
- **Presupuestos:** 1 presupuesto de ejemplo «Presupuesto — Implantología» (₡1.469.000, IVA 13%).
- **Llamadas:** 2 (1 planificada, 1 realizada).
- **Reuniones:** 2 (1 planificada, 1 realizada).
- **Notas:** en cuenta, contacto principal y oportunidad de implantes.

Emails con dominio `.example` para evitar direcciones reales. Descripciones marcadas con `[DEMO Dental Demo]`.

## Cargar

```bash
ssh root@185.176.254.121
cd /opt/matmax-crm
./scripts/demo-dental.sh
```

El script es idempotente: si ya existe la cuenta o el archivo de IDs, se niega a duplicar. Tarda unos minutos porque crea los registros vía API.

## Eliminar

```bash
ssh root@185.176.254.121
cd /opt/matmax-crm
./scripts/cleanup-dental-demo.sh
```

Borra por relación (`accountId`/`parentId`) y por el marcador de la demo; elimina también el archivo `demo/dental-demo-ids.json`. Es idempotente: si no existe, no hace nada.

## Recargar

```bash
./scripts/cleanup-dental-demo.sh
./scripts/demo-dental.sh
```

Las fechas se calculan respecto al día de la carga, así que la demo se ve actualizada.

## Notas

- El deploy (`deploy.sh`) excluye `demo/`, por lo que no borra los IDs al sincronizar.
- La demo ocupa pocos recursos (~1 MB de datos) y no afecta al núcleo.
- No se incluye en backups como dato crítico; si se restaura un backup anterior, puede desaparecer.
