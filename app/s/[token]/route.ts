import { NextResponse } from 'next/server'
import { get, run } from '@/lib/server/db'
import { openTableSession } from '@/lib/server/auth'
import { getSettings } from '@/lib/server/settings'
import { originOf } from '@/lib/server/origin'
import { sha256 } from '@/lib/server/security'

export const dynamic = 'force-dynamic'

/** One-time waiter-issued link/QR: gives the customer's phone a trusted session for one table. */
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const origin = originOf(req)
  const link = get<{ table_id: number; created_by: number | null }>(
    `SELECT table_id, created_by FROM waiter_links WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')
     AND EXISTS (SELECT 1 FROM tables t WHERE t.id = table_id AND t.active = 1)`,
    sha256(token),
  )
  if (!link) return NextResponse.redirect(new URL('/?table=invalid', origin))
  run(`UPDATE waiter_links SET used_at = datetime('now') WHERE token_hash = ?`, sha256(token))
  await openTableSession(link.table_id, 'waiter', getSettings().tableSessionHours, link.created_by)
  return NextResponse.redirect(new URL('/#full-menu', origin))
}
