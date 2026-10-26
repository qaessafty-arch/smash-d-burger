import { ApiError, body, json, route, str } from '@/lib/server/http'
import { audit, requireStaff } from '@/lib/server/auth'
import { run } from '@/lib/server/db'
import { staffOrder } from '@/lib/server/orders'

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff('waiter', 'manager', 'admin')
  const { id } = await ctx.params
  const b = await body(req)
  const note = str(b.note, 'note', { max: 500 })
  const r = run(`UPDATE orders SET internal_note = ?, updated_at = datetime('now') WHERE public_id = ?`, note, id)
  if (!r.changes) throw new ApiError(404, 'Order not found', 'not_found')
  audit(staff, staff.name, 'order.note', id, note)
  return json({ order: staffOrder(id) })
})
