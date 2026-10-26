import { int, json, route } from '@/lib/server/http'
import { requireStaff } from '@/lib/server/auth'
import { all } from '@/lib/server/db'
import { iso } from '@/lib/server/orders'

export const dynamic = 'force-dynamic'

export const GET = route(async (req) => {
  await requireStaff('admin')
  const limit = int(new URL(req.url).searchParams.get('limit') ?? 100, 'limit', { min: 1, max: 500 })!
  return json({
    entries: all<{ id: number; actor: string; action: string; target: string; detail: string; created_at: string }>(
      'SELECT id, actor, action, target, detail, created_at FROM audit_log ORDER BY id DESC LIMIT ?', limit,
    ).map((r) => ({ ...r, created_at: iso(r.created_at) })),
  })
})
