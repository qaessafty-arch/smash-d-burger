import { ApiError, body, json, route, str } from '@/lib/server/http'
import { requireStaff } from '@/lib/server/auth'
import { STATUSES, staffOrder, transition, type OrderStatus } from '@/lib/server/orders'

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff('waiter', 'kitchen', 'manager', 'admin')
  const { id } = await ctx.params
  const b = await body(req)
  const to = str(b.to, 'to', { required: true, max: 30 }) as OrderStatus
  if (!(STATUSES as readonly string[]).includes(to)) throw new ApiError(400, 'Unknown status', 'invalid')
  transition(id, to, { staff, label: `${staff.name} (${staff.role})` }, { reason: str(b.reason, 'reason', { max: 300 }), note: str(b.note, 'note', { max: 300 }) })
  return json({ order: staffOrder(id) })
})
