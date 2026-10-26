import { ApiError, body, json, limit, route, clientIp } from '@/lib/server/http'
import { currentTableSession } from '@/lib/server/auth'
import { createOrder, type CartLine } from '@/lib/server/orders'

export const dynamic = 'force-dynamic'

export const POST = route(async (req) => {
  const session = await currentTableSession()
  if (!session) throw new ApiError(403, 'Scan your table QR code or choose your table first', 'no_table')
  limit(`order:${session.id}`, 8, 10 * 60_000)
  limit(`order-ip:${await clientIp()}`, 40, 10 * 60_000)
  const b = await body<{ lines: CartLine[]; note?: string; idempotencyKey: string }>(req)
  const r = createOrder(session, { lines: b.lines, note: b.note, idempotencyKey: b.idempotencyKey })
  if (r.duplicate) throw new ApiError(409, 'This order was already submitted', 'duplicate')
  return json({ trackToken: r.trackToken }, { status: 201 })
})
