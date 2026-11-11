export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'amber'

export interface ColumnDef {
  key: string
  label: string
  type?: 'text' | 'person' | 'contact' | 'email' | 'phone' | 'currency' | 'date' | 'datetime' | 'badge' | 'owner' | 'number'
  width?: string
  sortable?: boolean
  hideOnMobile?: boolean
}

export interface EntityConfig {
  entity: string
  label: string
  plural: string
  route: string
  detailRoute: string
  columns: ColumnDef[]
  formFields: string[]
  defaultOrderBy: string
  defaultOrder?: 'asc' | 'desc'
  select: string
  searchFields: string
}

export const ENTITY_LABELS: Record<string, string> = {
  Contact: 'Contacto',
  Account: 'Empresa',
  Lead: 'Lead',
  Opportunity: 'Oportunidad',
  CTreatment: 'Tratamiento',
  CCQuote: 'Presupuesto',
  Task: 'Tarea',
  Call: 'Llamada',
  Meeting: 'Reunión',
  User: 'Usuario',
  Team: 'Equipo',
  Role: 'Rol',
}

export const STAGE_META: Record<string, { label: string; tone: Tone; color: string; probability: number }> = {
  Prospecting: { label: 'Prospección', tone: 'neutral', color: '#94a3b8', probability: 10 },
  Qualification: { label: 'Cualificación', tone: 'info', color: '#3b82f6', probability: 30 },
  Proposal: { label: 'Propuesta', tone: 'amber', color: '#d99a2b', probability: 55 },
  Negotiation: { label: 'Negociación', tone: 'violet', color: '#8b5cf6', probability: 75 },
  'Closed Won': { label: 'Ganada', tone: 'success', color: '#12805c', probability: 100 },
  'Closed Lost': { label: 'Perdida', tone: 'danger', color: '#d64545', probability: 0 },
}

export const DEFAULT_STAGES = Object.keys(STAGE_META)

export const LEAD_STATUS: Record<string, { label: string; tone: Tone }> = {
  New: { label: 'Nuevo', tone: 'info' },
  Assigned: { label: 'Asignado', tone: 'brand' },
  'In Process': { label: 'En proceso', tone: 'amber' },
  Converted: { label: 'Convertido', tone: 'success' },
  Recycled: { label: 'Reciclado', tone: 'violet' },
  Dead: { label: 'Descartado', tone: 'danger' },
}

export const TASK_STATUS: Record<string, { label: string; tone: Tone }> = {
  'Not Started': { label: 'Pendiente', tone: 'neutral' },
  Started: { label: 'En curso', tone: 'info' },
  Completed: { label: 'Completada', tone: 'success' },
  Canceled: { label: 'Cancelada', tone: 'danger' },
  Deferred: { label: 'Aplazada', tone: 'warning' },
}

export const ACTIVITY_STATUS: Record<string, { label: string; tone: Tone }> = {
  Planned: { label: 'Planificada', tone: 'info' },
  Held: { label: 'Realizada', tone: 'success' },
  'Not Held': { label: 'No realizada', tone: 'danger' },
}

export const PRIORITY: Record<string, { label: string; tone: Tone }> = {
  Low: { label: 'Baja', tone: 'neutral' },
  Normal: { label: 'Normal', tone: 'info' },
  High: { label: 'Alta', tone: 'amber' },
  Urgent: { label: 'Urgente', tone: 'danger' },
}

export const TREATMENT_CATEGORIES = [
  'Diagnóstico',
  'Ortodoncia',
  'Implantología',
  'Estética',
  'General',
  'Otro',
]

export const QUOTE_STATUS: Record<string, { label: string; tone: Tone }> = {
  Draft: { label: 'Borrador', tone: 'neutral' },
  Sent: { label: 'Enviado', tone: 'info' },
  Accepted: { label: 'Aceptado', tone: 'success' },
  Rejected: { label: 'Rechazado', tone: 'danger' },
  Expired: { label: 'Vencido', tone: 'warning' },
}

export const SOURCE: Record<string, string> = {
  Call: 'Llamada',
  Email: 'Email',
  'Existing Customer': 'Cliente existente',
  Partner: 'Socio',
  'Public Relations': 'Relaciones públicas',
  'Web Site': 'Sitio web',
  Campaign: 'Campaña',
  Other: 'Otro',
}

export const ACCOUNT_TYPE: Record<string, string> = {
  Customer: 'Cliente',
  Investor: 'Inversor',
  Partner: 'Socio',
  Reseller: 'Revendedor',
}

export const CONTACT_ROLE: Record<string, string> = {
  'Decision Maker': 'Decisor',
  Evaluator: 'Evaluador',
  Influencer: 'Influenciador',
}

export function statusMeta(entity: string, value: unknown): { label: string; tone: Tone } {
  const key = String(value ?? '')
  if (entity === 'Lead') return LEAD_STATUS[key] ?? { label: key || '—', tone: 'neutral' }
  if (entity === 'Task') return TASK_STATUS[key] ?? { label: key || '—', tone: 'neutral' }
  if (entity === 'Call' || entity === 'Meeting') return ACTIVITY_STATUS[key] ?? { label: key || '—', tone: 'neutral' }
  if (entity === 'CCQuote') return QUOTE_STATUS[key] ?? { label: key || '—', tone: 'neutral' }
  return { label: key || '—', tone: 'neutral' }
}

export function stageMeta(value: unknown) {
  const key = String(value ?? '')
  return STAGE_META[key] ?? { label: key || '—', tone: 'neutral' as Tone, color: '#94a3b8', probability: 0 }
}

export function priorityMeta(value: unknown) {
  const key = String(value ?? '')
  return PRIORITY[key] ?? { label: key || '—', tone: 'neutral' as Tone }
}

export function optionLabel(field: string, value: unknown): string {
  const key = String(value ?? '')
  if (!key) return ''
  if (field === 'source') return SOURCE[key] ?? key
  if (field === 'type') return ACCOUNT_TYPE[key] ?? key
  if (field === 'contactRole') return CONTACT_ROLE[key] ?? key
  return key
}

export const CONTACT_CONFIG: EntityConfig = {
  entity: 'Contact',
  label: 'Contacto',
  plural: 'Contactos',
  route: '/contacts',
  detailRoute: '/contacts',
  defaultOrderBy: 'createdAt',
  defaultOrder: 'desc',
  select:
    'name,firstName,lastName,emailAddress,phoneNumber,title,accountId,accountName,assignedUserId,assignedUserName,createdAt,modifiedAt',
  searchFields: 'name,emailAddress,phoneNumber',
  columns: [
    { key: 'name', label: 'Nombre', type: 'person', width: '24%' },
    { key: 'accountName', label: 'Empresa', type: 'text', width: '20%' },
    { key: 'emailAddress', label: 'Email', type: 'email', width: '20%', hideOnMobile: true },
    { key: 'phoneNumber', label: 'Teléfono', type: 'phone', width: '14%', hideOnMobile: true },
    { key: 'assignedUserName', label: 'Responsable', type: 'owner', width: '12%' },
    { key: 'createdAt', label: 'Creado', type: 'date', width: '10%', hideOnMobile: true },
  ],
  formFields: [
    'firstName',
    'lastName',
    'emailAddress',
    'phoneNumber',
    'title',
    'account',
    'assignedUser',
    'description',
    'addressStreet',
    'addressCity',
    'addressPostalCode',
    'addressCountry',
  ],
}

export const ACCOUNT_CONFIG: EntityConfig = {
  entity: 'Account',
  label: 'Empresa',
  plural: 'Empresas',
  route: '/accounts',
  detailRoute: '/accounts',
  defaultOrderBy: 'createdAt',
  defaultOrder: 'desc',
  select:
    'name,website,emailAddress,phoneNumber,type,industry,assignedUserId,assignedUserName,createdAt,modifiedAt',
  searchFields: 'name,emailAddress,phoneNumber,website',
  columns: [
    { key: 'name', label: 'Empresa', type: 'person', width: '28%' },
    { key: 'industry', label: 'Sector', type: 'text', width: '18%' },
    { key: 'emailAddress', label: 'Email', type: 'email', width: '20%', hideOnMobile: true },
    { key: 'phoneNumber', label: 'Teléfono', type: 'phone', width: '14%', hideOnMobile: true },
    { key: 'assignedUserName', label: 'Responsable', type: 'owner', width: '12%' },
    { key: 'createdAt', label: 'Creada', type: 'date', width: '10%', hideOnMobile: true },
  ],
  formFields: [
    'name',
    'website',
    'emailAddress',
    'phoneNumber',
    'type',
    'industry',
    'assignedUser',
    'description',
    'billingAddressStreet',
    'billingAddressCity',
    'billingAddressPostalCode',
    'billingAddressCountry',
  ],
}

export const LEAD_CONFIG: EntityConfig = {
  entity: 'Lead',
  label: 'Lead',
  plural: 'Leads',
  route: '/leads',
  detailRoute: '/leads',
  defaultOrderBy: 'createdAt',
  defaultOrder: 'desc',
  select:
    'name,firstName,lastName,status,source,emailAddress,phoneNumber,industry,opportunityAmount,assignedUserId,assignedUserName,createdAt,modifiedAt',
  searchFields: 'name,emailAddress,phoneNumber',
  columns: [
    { key: 'name', label: 'Lead', type: 'person', width: '24%' },
    { key: 'status', label: 'Estado', type: 'badge', width: '14%' },
    { key: 'emailAddress', label: 'Email', type: 'email', width: '20%', hideOnMobile: true },
    { key: 'phoneNumber', label: 'Teléfono', type: 'phone', width: '14%', hideOnMobile: true },
    { key: 'opportunityAmount', label: 'Valor', type: 'currency', width: '10%' },
    { key: 'assignedUserName', label: 'Responsable', type: 'owner', width: '12%' },
  ],
  formFields: [
    'firstName',
    'lastName',
    'emailAddress',
    'phoneNumber',
    'status',
    'source',
    'industry',
    'website',
    'opportunityAmount',
    'assignedUser',
    'description',
  ],
}

export const OPPORTUNITY_CONFIG: EntityConfig = {
  entity: 'Opportunity',
  label: 'Oportunidad',
  plural: 'Oportunidades',
  route: '/opportunities',
  detailRoute: '/opportunities',
  defaultOrderBy: 'createdAt',
  defaultOrder: 'desc',
  select:
    'name,accountId,accountName,contactId,contactName,stage,amount,probability,closeDate,assignedUserId,assignedUserName,createdAt,modifiedAt',
  searchFields: 'name',
  columns: [
    { key: 'name', label: 'Oportunidad', type: 'text', width: '24%' },
    { key: 'contactName', label: 'Contacto', type: 'contact', width: '17%' },
    { key: 'accountName', label: 'Empresa', type: 'text', width: '17%' },
    { key: 'stage', label: 'Etapa', type: 'badge', width: '12%' },
    { key: 'amount', label: 'Importe', type: 'currency', width: '12%' },
    { key: 'closeDate', label: 'Cierre', type: 'date', width: '10%', hideOnMobile: true },
    { key: 'assignedUserName', label: 'Responsable', type: 'owner', width: '12%' },
  ],
  formFields: [
    'name',
    'account',
    'contact',
    'stage',
    'amount',
    'probability',
    'closeDate',
    'assignedUser',
    'description',
  ],
}

export const TREATMENT_CONFIG: EntityConfig = {
  entity: 'CTreatment',
  label: 'Tratamiento',
  plural: 'Tratamientos',
  route: '/treatments',
  detailRoute: '/treatments',
  defaultOrderBy: 'name',
  defaultOrder: 'asc',
  select: 'name,category,price,duration,active,description',
  searchFields: 'name',
  columns: [
    { key: 'name', label: 'Tratamiento', type: 'text', width: '38%' },
    { key: 'category', label: 'Categoría', type: 'text', width: '20%' },
    { key: 'price', label: 'Precio', type: 'currency', width: '18%' },
    { key: 'duration', label: 'Duración (min)', type: 'number', width: '14%' },
  ],
  formFields: ['name', 'category', 'price', 'duration', 'active', 'description'],
}

export const QUOTE_CONFIG: EntityConfig = {
  entity: 'CCQuote',
  label: 'Presupuesto',
  plural: 'Presupuestos',
  route: '/quotes',
  detailRoute: '/quotes',
  defaultOrderBy: 'createdAt',
  defaultOrder: 'desc',
  select: 'name,status,total,validUntil,opportunityId,opportunityName,accountName,contactName,createdAt',
  searchFields: 'name',
  columns: [
    { key: 'name', label: 'Presupuesto', type: 'text', width: '28%' },
    { key: 'opportunityName', label: 'Oportunidad', type: 'text', width: '24%' },
    { key: 'status', label: 'Estado', type: 'badge', width: '14%' },
    { key: 'total', label: 'Total', type: 'currency', width: '16%' },
    { key: 'validUntil', label: 'Válido hasta', type: 'date', width: '18%' },
  ],
  formFields: ['name', 'status', 'validUntil', 'taxRate', 'notes'],
}

export const ENTITY_CONFIGS: Record<string, EntityConfig> = {
  Contact: CONTACT_CONFIG,
  Account: ACCOUNT_CONFIG,
  Lead: LEAD_CONFIG,
  Opportunity: OPPORTUNITY_CONFIG,
  CTreatment: TREATMENT_CONFIG,
  CCQuote: QUOTE_CONFIG,
}

export const TASK_FIELDS = [
  'name',
  'status',
  'priority',
  'dateEnd',
  'assignedUser',
  'account',
  'contact',
  'description',
]

export const CALL_FIELDS = [
  'name',
  'status',
  'dateStart',
  'dateEnd',
  'direction',
  'assignedUser',
  'account',
  'description',
]

export const MEETING_FIELDS = [
  'name',
  'status',
  'dateStart',
  'dateEnd',
  'assignedUser',
  'account',
  'description',
]
