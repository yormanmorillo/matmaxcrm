import type { Session } from '@/types/espocrm'

const KEY = 'matmax.session'

export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Session
    if (!parsed?.token || !parsed?.user?.userName) return null
    return parsed
  } catch {
    return null
  }
}

export function saveSession(session: Session): void {
  sessionStorage.setItem(KEY, JSON.stringify(session))
}

export function clearSession(): void {
  sessionStorage.removeItem(KEY)
}
