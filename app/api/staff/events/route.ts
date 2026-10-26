import { requireStaff } from '@/lib/server/auth'
import { sseStream } from '@/lib/server/events'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const staff = await requireStaff('waiter', 'kitchen', 'manager', 'admin')
    return sseStream(staff.role === 'kitchen' ? ['kitchen'] : ['staff', 'kitchen'], req.signal)
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }
}
