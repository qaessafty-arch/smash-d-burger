import { body, json, route, str } from '@/lib/server/http'
import { requireStaff } from '@/lib/server/auth'
import { previewVerification } from '@/lib/server/orders'

/** Step 1: look up an order by code or QR token. Read-only; the waiter reviews it before verifying. */
export const POST = route(async (req) => {
  const staff = await requireStaff('waiter', 'manager', 'admin')
  const b = await body(req)
  const order = previewVerification(staff, { code: str(b.code, 'code', { max: 12 }), token: str(b.token, 'token', { max: 80 }) })
  return json({ order })
})
