// Configuración regional y de producto.
export const APP_LOCALE = 'es-CR'
export const APP_CURRENCY = 'CRC'
export const APP_CURRENCY_SYMBOL = '₡'
export const APP_TIMEZONE = 'America/Costa_Rica'

// Acceso temporal a la administración nativa (el DNS admin sigue pendiente).
// Cuando exista admin.crm.matmax.site, cambiar aquí o definir VITE_ADMIN_URL en build.
export const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || 'https://crm.matmax.site:8443'
