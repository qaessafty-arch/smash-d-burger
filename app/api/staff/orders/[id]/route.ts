import { ApiError, json, route } from '@/lib/server/http'
import { requireStaff } from '@/lib/server/auth'
import { staffOrder } from '@/lib/server/orders'

export const dynamic = 'force-dynamic'

export const GET = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  await requireStaff('waiter', 'kitchen', 'manager', 'admin')
  const { id } = await ctx.params
  const o = staffOrder(id)
  if (!o) throw new ApiError(404, 'Order not found', 'not_found')
  return json({ order: o })
})
