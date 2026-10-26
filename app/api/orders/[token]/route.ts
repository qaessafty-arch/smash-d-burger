import { ApiError, json, route, limit, clientIp } from '@/lib/server/http'
import { orderByTrackToken } from '@/lib/server/orders'
import { publicSettings } from '@/lib/server/settings'

export const dynamic = 'force-dynamic'

export const GET = route(async (_req, ctx: { params: Promise<{ token: string }> }) => {
  const { token } = await ctx.params
  limit(`track:${await clientIp()}`, 240, 60_000)
  const o = orderByTrackToken(token)
  if (!o) throw new ApiError(404, 'Order not found', 'not_found')
  const { _orderId, ...view } = o
  void _orderId
  const s = publicSettings()
  return json({ order: view, restaurant: { name: s.restaurantName, currency: s.currency } }, { headers: { 'Cache-Control': 'no-store' } })
})
