import { body, json, route, str } from '@/lib/server/http'
import { requireStaff } from '@/lib/server/auth'
import { verifyOrder } from '@/lib/server/orders'

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff('waiter', 'manager', 'admin')
  const { id } = await ctx.params
  const b = await body(req)
  const order = verifyOrder(staff, id, { code: str(b.code, 'code', { max: 12 }), token: str(b.token, 'token', { max: 80 }) })
  return json({ order })
})
