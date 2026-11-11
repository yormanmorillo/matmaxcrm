import type { AppUserResponse, ListResponse, EntityRecord } from '@/types/espocrm'
import { clearSession, loadSession } from './session'

const BASE = '/api/v1'

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export function base64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

export function authHeader(userName: string, secret: string): string {
  return base64Utf8(`${userName}:${secret}`)
}

type QueryValue = any

export function buildQuery(params: Record<string, QueryValue> | undefined): string {
  if (!params) return ''
  const parts: string[] = []

  const walk = (value: QueryValue, key: string) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${key}[${index}]`))
      return
    }
    if (typeof value === 'object') {
      Object.entries(value).forEach(([childKey, childValue]) => walk(childValue, `${key}[${childKey}]`))
      return
    }
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  }

  Object.entries(params).forEach(([key, value]) => walk(value, key))
  return parts.length ? `?${parts.join('&')}` : ''
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  params?: Record<string, QueryValue>
  signal?: AbortSignal
}

function notifyUnauthorized(): void {
  clearSession()
  window.dispatchEvent(new CustomEvent('matmax:unauthorized'))
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const session = loadSession()
  if (!session) {
    notifyUnauthorized()
    throw new ApiError('Sesión no iniciada', 401)
  }

  const headers: Record<string, string> = {
    'Espo-Authorization': authHeader(session.user.userName, session.token),
    Accept: 'application/json',
  }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 45000)
  const signal = options.signal ?? controller.signal

  let response: Response
  try {
    response = await fetch(`${BASE}${path}${buildQuery(options.params)}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal,
      credentials: 'same-origin',
    })
  } finally {
    window.clearTimeout(timeout)
  }

  if (response.status === 401) {
    notifyUnauthorized()
    throw new ApiError('Tu sesión ha caducado. Inicia sesión de nuevo.', 401)
  }

  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '')

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message?: string }).message)
        : '') ||
      response.headers.get('x-status-reason') ||
      `Error ${response.status}`
    throw new ApiError(message, response.status, payload)
  }

  return payload as T
}

export function getList<T = EntityRecord>(
  entity: string,
  params?: Record<string, QueryValue>,
): Promise<ListResponse<T>> {
  return request<ListResponse<T>>(`/${entity}`, { params })
}

export function getRecord<T = EntityRecord>(
  entity: string,
  id: string,
  params?: Record<string, QueryValue>,
): Promise<T> {
  return request<T>(`/${entity}/${id}`, { params })
}

export function createRecord<T = EntityRecord>(entity: string, body: unknown): Promise<T> {
  return request<T>(`/${entity}`, { method: 'POST', body })
}

export function updateRecord<T = EntityRecord>(entity: string, id: string, body: unknown): Promise<T> {
  return request<T>(`/${entity}/${id}`, { method: 'PATCH', body })
}

export function putRecord<T = EntityRecord>(entity: string, id: string, body: unknown): Promise<T> {
  return request<T>(`/${entity}/${id}`, { method: 'PUT', body })
}

export function deleteRecord(entity: string, id: string): Promise<void> {
  return request<void>(`/${entity}/${id}`, { method: 'DELETE' })
}

export async function loginRequest(userName: string, password: string): Promise<AppUserResponse> {
  const response = await fetch(`${BASE}/App/user`, {
    method: 'GET',
    headers: {
      'Espo-Authorization': authHeader(userName, password),
      Accept: 'application/json',
    },
    credentials: 'same-origin',
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(
      response.status === 401 ? 'Usuario o contraseña incorrectos.' : 'No se pudo iniciar sesión.',
      response.status,
      payload,
    )
  }
  return payload as AppUserResponse
}

export function currentUser(): Promise<AppUserResponse> {
  return request<AppUserResponse>('/App/user')
}
