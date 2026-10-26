import { ApiError, body, json, limit, route, clientIp, str } from '@/lib/server/http'
import { get, run } from '@/lib/server/db'
import { audit, startStaffSession, type Staff } from '@/lib/server/auth'
import { hashPassword, verifyPassword } from '@/lib/server/security'

const DUMMY = hashPassword('not-a-real-password') // equalise timing for unknown users

export const POST = route(async (req) => {
  const ip = await clientIp()
  limit(`login-ip:${ip}`, 20, 10 * 60_000)
  const b = await body(req)
  const username = str(b.username, 'username', { required: true, max: 60 })
  const password = str(b.password, 'password', { required: true, max: 200 })
  limit(`login-user:${username.toLowerCase()}`, 8, 10 * 60_000)

  const row = get<Staff & { password_hash: string; active: number }>(
    'SELECT id, username, name, role, password_hash, active FROM staff WHERE username = ?', username)
  const ok = verifyPassword(password, row?.password_hash ?? DUMMY) && !!row && !!row.active
  if (!ok || !row) {
    audit(null, username, 'login.failed', '', '', ip)
    throw new ApiError(401, 'Wrong username or password', 'bad_credentials')
  }
  await startStaffSession(row.id)
  run(`UPDATE staff SET last_login_at = datetime('now') WHERE id = ?`, row.id)
  audit(row, row.name, 'login', '', '', ip)
  return json({ staff: { id: row.id, username: row.username, name: row.name, role: row.role } })
})
