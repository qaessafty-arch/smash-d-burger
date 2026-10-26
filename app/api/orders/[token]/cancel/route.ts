import { ApiError, body, json, route, str } from '@/lib/server/http'
import { orderByTrackToken, transition } from '@/lib/server/orders'

export const POST = route(async (req, ctx: { params: Promise<{ token: string }> }) => {
  const { token } = await ctx.params
  const o = orderByTrackToken(token)
  if (!o) throw new ApiError(404, 'Order not found', 'not_found')
  if (o.status !== 'awaiting_verification')
    throw new ApiError(409, 'This order is already with the restaurant. Please ask your waiter to cancel it.', 'not_cancellable')
  const b = await body(req).catch(() => ({}))
  const reason = str((b as Record<string, unknown>).reason, 'reason', { max: 200 }) || 'Cancelled by customer'
  transition(o.id, 'cancelled', { staff: null, label: `customer@table ${o.tableNumber}` }, { reason })
  return json({ ok: true })
})
