import { ApiError, body, json, limit, route, str } from '@/lib/server/http'
import { currentTableSession } from '@/lib/server/auth'
import { createServiceRequest, listRequests } from '@/lib/server/orders'

export const dynamic = 'force-dynamic'

export const GET = route(async () => {
  const session = await currentTableSession()
  if (!session) return json({ requests: [] })
  const open = listRequests({ tableId: session.table_id, onlyOpen: true })
  return json({ requests: open.map((r) => ({ id: r.id, type: r.type, status: r.status })) })
})

export const POST = route(async (req) => {
  const session = await currentTableSession()
  if (!session) throw new ApiError(403, 'Choose your table first', 'no_table')
  limit(`request:${session.id}`, 10, 10 * 60_000)
  const b = await body(req)
  const r = createServiceRequest(session, str(b.type, 'type', { required: true, max: 30 }))
  return json(r, { status: r.duplicate ? 200 : 201 })
})
