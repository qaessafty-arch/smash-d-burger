import { json, route } from '@/lib/server/http'
import { requireStaff } from '@/lib/server/auth'
import { createItem } from '@/lib/server/admin-items'
import { body } from '@/lib/server/http'

export const POST = route(async (req) => {
  const staff = await requireStaff('manager', 'admin')
  const id = createItem(staff, await body(req))
  return json({ id }, { status: 201 })
})
