# Pruebas E2E — MATMAX CRM

Requieren Playwright y un navegador Chromium.

```bash
cd tests
npm install
npx playwright install chromium
```

Variables de entorno (credenciales de administrador):

```bash
export ADMIN_USER=admin
export ADMIN_PASS='...'   # leer de /opt/matmax-crm/secrets/admin-credentials.txt
```

Ejecutar:

```bash
npm run smoke        # login, dashboard, listados, tema oscuro
npm run crud         # crear/editar/borrar contacto, crear oportunidad, Kanban, búsqueda
npm run modules      # tareas, calendario, informes, admin, móvil
npm run permissions  # usuario temporal con rol Ventas + equipo Comercial
npm run team         # crear/eliminar equipo
```

Las capturas se guardan en `../docs/screenshots/`.

`ui-permissions` crea un usuario y registros temporales y los elimina al final. `ui-crud` y `ui-modules` limpian lo que crean. No ejecutar contra producción sin entender que crea/borra datos de prueba.

La prueba de permisos espera un rol llamado **Ventas** y un equipo **Comercial**; si no existen, créalos antes (la instalación actual ya los tiene).
