import { ApiError, body, int, json, route } from '@/lib/server/http'
import { audit, requireStaff } from '@/lib/server/auth'
import { all, get, run } from '@/lib/server/db'
import { randomToken, sha256 } from '@/lib/server/security'
import { originOf } from '@/lib/server/origin'

export const dynamic = 'force-dynamic'

/** Floor view: every active table with its open orders, requests, and assigned waiter. */
export const GET = route(async () => {
  await requireStaff('waiter', 'manager', 'admin')
  const tables = all<{ id: number; number: string; location: string; occupied: number; waiter: string | null; waiter_id: number | null; open_orders: number; open_requests: number }>(
    `SELECT t.id, t.number, t.location, t.occupied, s.name AS waiter, t.waiter_id,
       (SELECT COUNT(*) FROM orders o WHERE o.table_id = t.id AND o.status NOT IN ('completed','rejected','cancelled')) AS open_orders,
       (SELECT COUNT(*) FROM service_requests r WHERE r.table_id = t.id AND r.status != 'completed') AS open_requests
     FROM tables t LEFT JOIN staff s ON s.id = t.waiter_id WHERE t.active = 1 ORDER BY CAST(t.number AS INTEGER), t.number`)
  return json({ tables: tables.map((t) => ({ id: t.id, number: t.number, location: t.location, occupied: !!t.occupied, waiter: t.waiter, waiterId: t.waiter_id, openOrders: t.open_orders, openRequests: t.open_requests })) })
})

/** Waiter-assisted session: returns a one-time URL (shown as a QR) that gives the customer a trusted table session. */
export const POST = route(async (req) => {
  const staff = await requireStaff('waiter', 'manager', 'admin')
  const b = await body(req)
  const tableId = int(b.tableId, 'tableId', { min: 1 })!
  if (!get('SELECT 1 FROM tables WHERE id = ? AND active = 1', tableId)) throw new ApiError(404, 'Table not found', 'not_found')
  const token = randomToken(24)
  run(`INSERT INTO waiter_links (token_hash, table_id, created_by, expires_at) VALUES (?, ?, ?, datetime('now', '+15 minutes'))`, sha256(token), tableId, staff.id)
  audit(staff, staff.name, 'table.assist_session', String(tableId))
  return json({ url: `${originOf(req)}/s/${token}`, expiresInMinutes: 15 })
})
