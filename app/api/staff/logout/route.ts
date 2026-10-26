import { json, route } from '@/lib/server/http'
import { currentStaff, endStaffSession, audit } from '@/lib/server/auth'

export const POST = route(async () => {
  const s = await currentStaff()
  await endStaffSession()
  if (s) audit(s, s.name, 'logout')
  return json({ ok: true })
})
