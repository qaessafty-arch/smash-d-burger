import { json, route } from '@/lib/server/http'
import { currentStaff } from '@/lib/server/auth'
import { getSettings } from '@/lib/server/settings'

export const dynamic = 'force-dynamic'

export const GET = route(async () => {
  const staff = await currentStaff()
  const s = getSettings()
  return json({ staff, restaurantName: s.restaurantName, soundAlerts: s.soundAlerts, waiterCanSkipKitchen: s.waiterCanSkipKitchen })
})
