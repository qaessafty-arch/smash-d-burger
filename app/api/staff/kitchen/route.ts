import { json, route } from '@/lib/server/http'
import { requireStaff } from '@/lib/server/auth'
import { kitchenOrders } from '@/lib/server/orders'

export const dynamic = 'force-dynamic'

export const GET = route(async () => {
  await requireStaff('kitchen', 'manager', 'admin')
  return json({ orders: kitchenOrders() })
})
