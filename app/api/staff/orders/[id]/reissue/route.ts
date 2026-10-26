import { ApiError, json, route } from '@/lib/server/http'
import { audit, requireStaff } from '@/lib/server/auth'
import { get } from '@/lib/server/db'
import { reissueVerification } from '@/lib/server/orders'
import { getSettings } from '@/lib/server/settings'

/** Waiter issues a fresh code when the original expired; the code is shown to the waiter only. */
export const POST = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff('waiter', 'manager', 'admin')
  const { id } = await ctx.params
  const row = get<{ id: number }>('SELECT id FROM orders WHERE public_id = ?', id)
  if (!row) throw new ApiError(404, 'Order not found', 'not_found')
  const r = reissueVerification(row.id, getSettings().verifyTtlMinutes)
  audit(staff, staff.name, 'order.reissue', id)
  return json({ code: r.code })
})
