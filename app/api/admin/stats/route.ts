import { json, route } from '@/lib/server/http'
import { requireStaff } from '@/lib/server/auth'
import { all, get } from '@/lib/server/db'

export const dynamic = 'force-dynamic'

/** Every number here is computed from the orders table. Nothing is estimated or sample data. */
export const GET = route(async (req) => {
  await requireStaff('manager', 'admin')
  const days = Math.min(Math.max(Number(new URL(req.url).searchParams.get('days') ?? 30) || 30, 1), 365)
  const c = (where: string, ...a: unknown[]) => get<{ c: number }>(`SELECT COUNT(*) c FROM orders WHERE ${where}`, ...a)!.c
  const since = `datetime('now', '-${days} days')`
  const sales = get<{ s: number | null }>(
    `SELECT SUM(total) s FROM orders WHERE status NOT IN ('cancelled','rejected') AND status IN ('served','completed') AND created_at >= ${since}`)!.s ?? 0
  return json({
    days,
    totalOrders: c(`created_at >= ${since}`),
    activeOrders: c(`status NOT IN ('completed','rejected','cancelled')`),
    pendingVerification: c(`status = 'awaiting_verification'`),
    preparing: c(`status IN ('confirmed','preparing')`),
    ready: c(`status = 'ready'`),
    completed: c(`status = 'completed' AND created_at >= ${since}`),
    cancelled: c(`status IN ('cancelled','rejected') AND created_at >= ${since}`),
    totalSales: sales,
    activeTables: get<{ c: number }>(`SELECT COUNT(DISTINCT table_id) c FROM orders WHERE status NOT IN ('completed','rejected','cancelled')`)!.c,
    popular: all<{ name: string; qty: number; revenue: number }>(
      `SELECT oi.name, SUM(oi.quantity) qty, SUM(oi.line_total) revenue FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.status NOT IN ('cancelled','rejected') AND o.created_at >= ${since} GROUP BY oi.name ORDER BY qty DESC LIMIT 8`),
    byDay: all<{ day: string; orders: number; sales: number }>(
      `SELECT date(created_at) day, COUNT(*) orders, SUM(CASE WHEN status IN ('served','completed') THEN total ELSE 0 END) sales
       FROM orders WHERE status NOT IN ('cancelled','rejected') AND created_at >= ${since} GROUP BY day ORDER BY day`),
  })
})
