import { ApiError, body, json, route, str } from '@/lib/server/http'
import { audit, requireStaff } from '@/lib/server/auth'
import { getSettings, setSetting } from '@/lib/server/settings'

export const dynamic = 'force-dynamic'

const REQUEST_TYPES = ['waiter', 'water', 'utensils', 'napkins', 'bill']
const pick = () => {
  const s = getSettings()
  return {
    orderingEnabled: s.orderingEnabled, deliveryEnabled: s.deliveryEnabled, manualTableMode: s.manualTableMode,
    requestTypes: s.requestTypes, notice: s.notice,
  }
}

/** Quick "pause" switches for the people running the floor. Managers and admins; nothing else can be changed here. */
export const GET = route(async () => {
  await requireStaff('manager', 'admin')
  return json({ switches: pick() })
})

export const PUT = route(async (req) => {
  const staff = await requireStaff('manager', 'admin')
  const b = await body(req)
  const changed: string[] = []
  for (const [k, v] of Object.entries(b)) {
    if (k === 'orderingEnabled' || k === 'deliveryEnabled') {
      if (typeof v !== 'boolean') throw new ApiError(400, `${k} must be on or off`, 'invalid')
      setSetting(k, v)
    } else if (k === 'manualTableMode') {
      if (!['open', 'waiter_only', 'off'].includes(v as string)) throw new ApiError(400, 'Invalid table mode', 'invalid')
      setSetting(k, v)
    } else if (k === 'requestTypes') {
      if (!Array.isArray(v) || !v.every((x) => REQUEST_TYPES.includes(x))) throw new ApiError(400, 'Invalid request types', 'invalid')
      setSetting(k, v)
    } else if (k === 'notice') {
      setSetting(k, str(v, 'notice', { max: 200 }))
    } else throw new ApiError(400, `Unknown switch: ${k}`, 'invalid')
    changed.push(`${k}=${JSON.stringify(v)}`)
  }
  audit(staff, staff.name, 'switches.update', '', changed.join(' '))
  return json({ switches: pick() })
})
