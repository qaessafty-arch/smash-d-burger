import { NextResponse } from 'next/server'
import { get } from '@/lib/server/db'
import { openTableSession } from '@/lib/server/auth'
import { getSettings } from '@/lib/server/settings'
import { originOf } from '@/lib/server/origin'
import { rateLimit } from '@/lib/server/security'

export const dynamic = 'force-dynamic'

/** Permanent table QR landing: /t/<secret>. Opens a table session and lands on the menu. */
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const origin = originOf(req)
  const ip = req.headers.get('x-forwarded-for') ?? 'local'
  if (!rateLimit(`qr:${ip}`, 60, 10 * 60_000)) return NextResponse.redirect(new URL('/?table=busy', origin))
  const t = token.length >= 12 && token.length <= 80
    ? get<{ id: number }>('SELECT id FROM tables WHERE qr_token = ? AND active = 1', token)
    : undefined
  if (!t) return NextResponse.redirect(new URL('/?table=invalid', origin))
  await openTableSession(t.id, 'qr', getSettings().tableSessionHours)
  return NextResponse.redirect(new URL('/#full-menu', origin))
}
