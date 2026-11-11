import { APP_CURRENCY_SYMBOL, APP_LOCALE, APP_TIMEZONE } from './config'

// Costa Rica usa punto de miles y coma decimal, igual que el locale es-ES.
const NUMBER_LOCALE = 'es-ES'

const numberFormatter = new Intl.NumberFormat(NUMBER_LOCALE)
const centsFormatter = new Intl.NumberFormat(NUMBER_LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function currency(value: unknown, cents = false): string {
  const num = typeof value === 'number' ? value : Number(value ?? 0)
  if (!Number.isFinite(num)) return '—'
  return `${APP_CURRENCY_SYMBOL}${(cents ? centsFormatter : numberFormatter).format(num)}`
}

export function compactCurrency(value: unknown): string {
  const num = typeof value === 'number' ? value : Number(value ?? 0)
  if (!Number.isFinite(num)) return '—'
  const compact = new Intl.NumberFormat(NUMBER_LOCALE, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num)
  return `${APP_CURRENCY_SYMBOL}${compact}`
}

export function number(value: unknown): string {
  const num = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(num) ? numberFormatter.format(num) : '—'
}

export function parseDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  const raw = String(value).trim()
  // EspoCRM devuelve datetime en UTC ("YYYY-MM-DD HH:mm:ss").
  const dateTime = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/)
  if (dateTime) {
    const date = new Date(`${dateTime[1]}T${dateTime[2]}Z`)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})$/)
  if (dateOnly) {
    const date = new Date(`${dateOnly[1]}T12:00:00Z`)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: unknown): string {
  const date = parseDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat(APP_LOCALE, { day: '2-digit', month: 'short', year: 'numeric', timeZone: APP_TIMEZONE }).format(date)
}

export function formatDateShort(value: unknown): string {
  const date = parseDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat(APP_LOCALE, { day: '2-digit', month: 'short', timeZone: APP_TIMEZONE }).format(date)
}

export function formatDateTime(value: unknown): string {
  const date = parseDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat(APP_LOCALE, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: APP_TIMEZONE,
  }).format(date)
}

export function formatTime(value: unknown): string {
  const date = parseDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat(APP_LOCALE, { hour: '2-digit', minute: '2-digit', timeZone: APP_TIMEZONE }).format(date)
}

export function toInputDate(value: unknown): string {
  const date = parseDate(value)
  if (!date) return ''
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: APP_TIMEZONE,
  }).format(date)
}

export function localToUtc(value: unknown): string {
  if (!value) return ''
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

export function toInputDateTime(value: unknown): string {
  const date = parseDate(value)
  if (!date) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: APP_TIMEZONE,
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

export function relativeTime(value: unknown): string {
  const date = parseDate(value)
  if (!date) return '—'
  const diff = Date.now() - date.getTime()
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat(APP_LOCALE, { numeric: 'auto' })
  const minute = 60_000
  const hour = 3_600_000
  const day = 86_400_000

  if (abs < minute) return 'ahora'
  if (abs < hour) return rtf.format(Math.round(-diff / minute), 'minute')
  if (abs < day) return rtf.format(Math.round(-diff / hour), 'hour')
  if (abs < day * 30) return rtf.format(Math.round(-diff / day), 'day')
  return formatDate(date)
}

export function humanize(value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  return String(value)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function initials(name: unknown): string {
  const value = String(name ?? '').trim()
  if (!value) return '?'
  const parts = value.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function isOverdue(value: unknown): boolean {
  const date = parseDate(value)
  if (!date) return false
  return date.getTime() < Date.now()
}

export function dateKey(value: unknown): string {
  const date = parseDate(value)
  if (!date) return ''
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: APP_TIMEZONE,
  }).format(date)
}

export function monthLabel(date: Date): string {
  const safe = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 15, 12))
  return new Intl.DateTimeFormat(APP_LOCALE, { month: 'long', year: 'numeric', timeZone: APP_TIMEZONE }).format(safe)
}

export function formatLongDate(value: Date = new Date()): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: APP_TIMEZONE,
  }).format(value)
}

export function hourInAppTimeZone(date: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone: APP_TIMEZONE,
  }).format(date)
  return Number(hour)
}

export function truncate(value: unknown, max = 120): string {
  const text = String(value ?? '')
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
