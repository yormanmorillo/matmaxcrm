export interface EspoUser {
  id: string
  userName: string
  firstName?: string | null
  lastName?: string | null
  name?: string | null
  type: 'admin' | 'regular' | 'portal' | 'api' | string
  isActive?: boolean
  emailAddress?: string | null
  phoneNumber?: string | null
  title?: string | null
  avatar?: string | null
  timeZone?: string | null
  language?: string | null
}

export interface AclScope {
  read?: 'all' | 'team' | 'own' | 'no' | string
  edit?: 'all' | 'team' | 'own' | 'no' | string
  delete?: 'all' | 'team' | 'own' | 'no' | string
  create?: 'yes' | 'no' | boolean | string
  stream?: 'all' | 'team' | 'no' | string
}

export interface Acl {
  table: Record<string, AclScope>
  assignmentPermission?: string
  userPermission?: string
  exportPermission?: string
  massUpdatePermission?: string
  [key: string]: unknown
}

export interface Session {
  token: string
  user: EspoUser
  acl: Acl
  preferences?: Record<string, unknown>
}

export interface ListResponse<T = EntityRecord> {
  total: number
  list: T[]
}

export type EntityRecord = Record<string, unknown> & { id: string }

export interface FieldDef {
  type: string
  required?: boolean
  options?: string[]
  isCustom?: boolean
  readOnly?: boolean
  disabled?: boolean
  tooltip?: string
  [key: string]: unknown
}

export interface EntityDef {
  fields: Record<string, FieldDef>
  [key: string]: unknown
}

export interface MetadataResponse {
  entityDefs: Record<string, EntityDef>
  [key: string]: unknown
}

export interface AppUserResponse {
  token: string
  user: EspoUser
  acl: Acl
  preferences?: Record<string, unknown>
}

export interface StreamPost {
  id: string
  type?: string
  post?: string | null
  createdAt?: string
  createdBy?: { id: string; name?: string } | null
  isNew?: boolean
  [key: string]: unknown
}
