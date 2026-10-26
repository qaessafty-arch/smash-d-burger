import { int, json, route, str } from '@/lib/server/http'
import { requireStaff } from '@/lib/server/auth'
import { listOrders } from '@/lib/server/orders'
import { get } from '@/lib/server/db'

export const dynamic = 'force-dynamic'

export const GET = route(async (req) => {
  const staff = await requireStaff('waiter', 'manager', 'admin')
  const u = new URL(req.url)
  const scope = u.searchParams.get('scope')
  const statuses = (u.searchParams.get('status') ?? '').split(',').filter(Boolean)
  let tableId: number | undefined
  const table = u.searchParams.get('table')
  if (table) tableId = get<{ id: number }>('SELECT id FROM tables WHERE number = ?', table)?.id ?? -1
  // Waiters see the live floor; history browsing/search is for managers and admins.
  const isManager = staff.role !== 'waiter'
  const active = ['awaiting_verification', 'verified', 'confirmed', 'preparing', 'ready', 'served']
  const out = listOrders({
    statuses: scope === 'active' || !isManager ? (statuses.filter((x) => active.includes(x)).length ? statuses.filter((x) => active.includes(x)) : active) : statuses,
    tableId,
    q: isManager ? str(u.searchParams.get('q'), 'q', { max: 40 }) : '',
    from: isManager ? u.searchParams.get('from') ?? undefined : undefined,
    to: isManager ? u.searchParams.get('to') ?? undefined : undefined,
    limit: int(u.searchParams.get('limit') ?? 50, 'limit', { min: 1, max: 200 })!,
    offset: int(u.searchParams.get('offset') ?? 0, 'offset', { min: 0, max: 1_000_000 })!,
  })
  return json(out)
})
