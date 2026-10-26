import { body, ApiError, json, limit, route, clientIp, str } from '@/lib/server/http'
import { all, get } from '@/lib/server/db'
import { audit, clearTableSession, currentTableSession, openTableSession } from '@/lib/server/auth'
import { getSettings } from '@/lib/server/settings'

export const dynamic = 'force-dynamic'

export const GET = route(async () => {
  const s = getSettings()
  const session = await currentTableSession()
  const tables =
    !session && s.manualTableMode === 'open'
      ? all<{ public_id: string; number: string; location: string }>(
          'SELECT public_id, number, location FROM tables WHERE active = 1 ORDER BY CAST(number AS INTEGER), number',
        ).map((t) => ({ publicId: t.public_id, number: t.number, location: t.location }))
      : []
  return json({
    table: session ? { number: session.table_number, location: session.location, trusted: !!session.trusted, source: session.source } : null,
    manualTableMode: s.manualTableMode,
    tables,
  })
})

/** Manual table selection (customer opened the menu without scanning a table QR). */
export const POST = route(async (req) => {
  limit(`table-pick:${await clientIp()}`, 20, 10 * 60_000)
  const s = getSettings()
  if (s.manualTableMode !== 'open')
    throw new ApiError(403, 'Please scan the QR code on your table or ask your waiter', 'manual_disabled')
  const b = await body(req)
  const publicId = str(b.publicId, 'table', { required: true, max: 40 })
  const t = get<{ id: number }>('SELECT id FROM tables WHERE public_id = ? AND active = 1', publicId)
  if (!t) throw new ApiError(404, 'That table is not available', 'invalid_table')
  await openTableSession(t.id, 'manual', s.tableSessionHours)
  audit(null, 'customer', 'table.manual_select', publicId, '', await clientIp())
  return json({ ok: true })
})

export const DELETE = route(async () => {
  await clearTableSession()
  return json({ ok: true })
})
