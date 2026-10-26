import { json, route } from '@/lib/server/http'
import { loadMenu } from '@/lib/server/menu'
import { publicSettings } from '@/lib/server/settings'

export const dynamic = 'force-dynamic'

export const GET = route(async () => {
  return json(
    { settings: publicSettings(), categories: loadMenu(false) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
})
