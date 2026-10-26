import { requireStaff } from '@/lib/server/auth'
import { route } from '@/lib/server/http'
import { all } from '@/lib/server/db'
import { audit } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

const csv = (v: unknown) => { const s = String(v ?? ''); return /^[=+\-@]/.test(s) ? `"'${s.replace(/"/g, '""')}"` : /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

/** Orders report as CSV. Cells starting with = + - @ are neutralised against spreadsheet formula injection. */
export const GET = route(async (req) => {
  const staff = await requireStaff('manager', 'admin')
  const u = new URL(req.url)
  const from = u.searchParams.get('from') ?? '1970-01-01'
  const to = u.searchParams.get('to') ?? '2999-01-01'
  const rows = all<Record<string, unknown>>(
    `SELECT o.number, o.created_at, o.table_number, o.status, o.verification_status, o.subtotal, o.tax, o.service_charge, o.total, o.cancel_reason,
       (SELECT GROUP_CONCAT(quantity || 'x ' || name, '; ') FROM order_items WHERE order_id = o.id) AS items
     FROM orders o WHERE o.created_at >= ? AND o.created_at < ? ORDER BY o.id`, from, to)
  const head = ['number', 'created_at_utc', 'table', 'status', 'verification', 'subtotal', 'tax', 'service_charge', 'total', 'items', 'cancel_reason']
  const lines = [head.join(',')].concat(rows.map((r) => [r.number, r.created_at, r.table_number, r.status, r.verification_status, r.subtotal, r.tax, r.service_charge, r.total, r.items, r.cancel_reason].map(csv).join(',')))
  audit(staff, staff.name, 'export.orders', '', `${rows.length} rows`)
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="orders.csv"' } })
})
