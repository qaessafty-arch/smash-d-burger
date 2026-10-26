import { ApiError, body, json, route, str } from '@/lib/server/http'
import { audit, requireStaff } from '@/lib/server/auth'
import { getSettings, setSetting, type Settings } from '@/lib/server/settings'

export const dynamic = 'force-dynamic'

export const GET = route(async () => {
  await requireStaff('admin')
  return json({ settings: getSettings() })
})

const bool = (v: unknown, k: string) => { if (typeof v !== 'boolean') throw new ApiError(400, `${k} must be on or off`, 'invalid'); return v }
const num = (v: unknown, k: string, min: number, max: number) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new ApiError(400, `${k} must be between ${min} and ${max}`, 'invalid')
  return v
}
const time = (v: unknown) => { if (typeof v !== 'string' || !/^([01]\d|2[0-4]):[0-5]\d$/.test(v)) throw new ApiError(400, 'Times must look like 09:30', 'invalid'); return v }

const VALIDATORS: Record<keyof Settings, (v: unknown) => unknown> = {
  restaurantName: (v) => str(v, 'restaurant name', { required: true, max: 80 }),
  tagline: (v) => str(v, 'tagline', { max: 120 }),
  description: (v) => str(v, 'description', { max: 600 }),
  logoUrl: (v) => str(v, 'logo', { max: 500 }),
  coverUrl: (v) => str(v, 'cover image', { max: 500 }),
  currency: (v) => str(v, 'currency', { required: true, max: 8 }),
  taxPercent: (v) => num(v, 'tax', 0, 50),
  servicePercent: (v) => num(v, 'service charge', 0, 50),
  timezone: (v) => { const t = str(v, 'timezone', { required: true, max: 60 }); try { new Intl.DateTimeFormat('en', { timeZone: t }) } catch { throw new ApiError(400, 'Unknown timezone', 'invalid') } return t },
  hours: (v) => {
    if (!Array.isArray(v) || v.length !== 7) throw new ApiError(400, 'Provide opening hours for all 7 days', 'invalid')
    return v.map((d) => ({ day: str(d.day, 'day', { required: true, max: 3 }), open: time(d.open), close: time(d.close), closed: bool(d.closed, 'closed') }))
  },
  orderingEnabled: (v) => bool(v, 'ordering'),
  requireVerification: (v) => bool(v, 'verification'),
  kitchenNeedsVerified: (v) => bool(v, 'kitchen rule'),
  waiterCanSkipKitchen: (v) => bool(v, 'waiter shortcut'),
  manualTableMode: (v) => { if (!['open', 'waiter_only', 'off'].includes(v as string)) throw new ApiError(400, 'Invalid table mode', 'invalid'); return v },
  verifyTtlMinutes: (v) => num(v, 'code lifetime', 5, 720),
  tableSessionHours: (v) => num(v, 'table session length', 1, 48),
  requestTypes: (v) => { if (!Array.isArray(v) || v.length > 12) throw new ApiError(400, 'Invalid request types', 'invalid'); return v.map((x) => str(x, 'request type', { required: true, max: 30 })) },
  soundAlerts: (v) => bool(v, 'sound alerts'),
  languages: (v) => { if (!Array.isArray(v) || !v.every((x) => ['EN', 'KU', 'AR'].includes(x))) throw new ApiError(400, 'Invalid languages', 'invalid'); return v },
  whatsapp: (v) => str(v, 'WhatsApp number', { max: 20 }),
}

export const PUT = route(async (req) => {
  const staff = await requireStaff('admin')
  const b = await body(req)
  const changed: string[] = []
  const validated: Array<[keyof Settings, unknown]> = []
  for (const [k, v] of Object.entries(b)) {
    const fn = VALIDATORS[k as keyof Settings]
    if (!fn) throw new ApiError(400, `Unknown setting: ${k}`, 'invalid')
    validated.push([k as keyof Settings, fn(v)])
  }
  for (const [k, v] of validated) { setSetting(k, v); changed.push(k) }
  audit(staff, staff.name, 'settings.update', changed.join(','))
  return json({ settings: getSettings() })
})
