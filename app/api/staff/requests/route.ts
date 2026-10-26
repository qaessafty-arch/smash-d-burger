import { body, int, json, route, str } from '@/lib/server/http'
import { requireStaff } from '@/lib/server/auth'
import { listRequests, updateRequest } from '@/lib/server/orders'

export const dynamic = 'force-dynamic'

export const GET = route(async () => {
  await requireStaff('waiter', 'manager', 'admin')
  return json({ requests: listRequests({ onlyOpen: true }) })
})

export const PATCH = route(async (req) => {
  const staff = await requireStaff('waiter', 'manager', 'admin')
  const b = await body(req)
  updateRequest(staff, int(b.id, 'id', { min: 1 })!, str(b.status, 'status', { required: true, max: 20 }))
  return json({ ok: true })
})
