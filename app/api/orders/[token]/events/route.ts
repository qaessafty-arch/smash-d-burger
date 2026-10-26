import { orderByTrackToken } from '@/lib/server/orders'
import { sseStream } from '@/lib/server/events'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const o = orderByTrackToken(token)
  if (!o) return new Response('Not found', { status: 404 })
  return sseStream([`order:${o.id}`], req.signal)
}
