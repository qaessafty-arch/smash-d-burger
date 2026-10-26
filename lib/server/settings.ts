import 'server-only'
import { all, run } from './db'
import { DEFAULT_SETTINGS, type Settings } from './bootstrap'

export type { Settings }

export function getSettings(): Settings {
  const rows = all<{ key: string; value: string }>('SELECT key, value FROM settings')
  const out: Record<string, unknown> = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
  for (const r of rows) {
    try { out[r.key] = JSON.parse(r.value) } catch { /* keep default */ }
  }
  return out as unknown as Settings
}

export function setSetting(key: keyof Settings, value: unknown) {
  run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, JSON.stringify(value))
}

/** What customers may see. Never leaks internal workflow switches. */
export function publicSettings() {
  const s = getSettings()
  return {
    restaurantName: s.restaurantName,
    tagline: s.tagline,
    description: s.description,
    logoUrl: s.logoUrl,
    coverUrl: s.coverUrl,
    currency: s.currency,
    taxPercent: s.taxPercent,
    servicePercent: s.servicePercent,
    hours: s.hours,
    timezone: s.timezone,
    orderingEnabled: s.orderingEnabled,
    manualTableMode: s.manualTableMode,
    requestTypes: s.requestTypes,
    languages: s.languages,
    whatsapp: s.whatsapp,
    deliveryEnabled: s.deliveryEnabled,
    notice: s.notice,
    isOpen: isOpenNow(s),
  }
}

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export function isOpenNow(s: Settings, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: s.timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)
  const wd = parts.find((p) => p.type === 'weekday')!.value.toLowerCase().slice(0, 3)
  const h = Number(parts.find((p) => p.type === 'hour')!.value) % 24
  const m = Number(parts.find((p) => p.type === 'minute')!.value)
  const today = s.hours.find((d) => d.day === wd) ?? s.hours[DAYS.indexOf(wd)]
  if (!today || today.closed) return false
  const toMin = (t: string) => { const [a, b] = t.split(':').map(Number); return a * 60 + (b || 0) }
  const cur = h * 60 + m
  const open = toMin(today.open)
  const close = toMin(today.close)
  return close > open ? cur >= open && cur < close : cur >= open || cur < close
}
