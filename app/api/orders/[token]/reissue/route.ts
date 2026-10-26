import { ApiError, json, limit, route } from '@/lib/server/http'
import { orderByTrackToken, reissueVerification } from '@/lib/server/orders'
import { getSettings } from '@/lib/server/settings'
import { get } from '@/lib/server/db'

/** Customer asks for a fresh code/QR (e.g. after the old one expired). Only while still unverified. */
export const POST = route(async (_req, ctx: { params: Promise<{ token: string }> }) => {
  const { token } = await ctx.params
  const o = orderByTrackToken(token)
  if (!o) throw new ApiError(404, 'Order not found', 'not_found')
  limit(`reissue:${o.id}`, 5, 10 * 60_000)
  const row = get<{ id: number }>('SELECT id FROM orders WHERE public_id = ?', o.id)!
  reissueVerification(row.id, getSettings().verifyTtlMinutes)
  return json({ ok: true })
})
