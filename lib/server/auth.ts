import 'server-only'
import { cookies } from 'next/headers'
import { get, run, all } from './db'
import { ApiError } from './http'
import { randomToken, sha256 } from './security'

export type Role = 'admin' | 'manager' | 'waiter' | 'kitchen'
export type Staff = { id: number; username: string; name: string; role: Role }

const STAFF_COOKIE = 'sb_staff'
const TABLE_COOKIE = 'sb_table'
const STAFF_TTL_HOURS = 12

const cookieBase = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production' && process.env.INSECURE_COOKIES !== '1',
  path: '/',
}

export async function startStaffSession(staffId: number) {
  const token = randomToken(32)
  run(
    `INSERT INTO staff_sessions (token_hash, staff_id, expires_at) VALUES (?, ?, datetime('now', ?))`,
    sha256(token), staffId, `+${STAFF_TTL_HOURS} hours`,
  )
  run('DELETE FROM staff_sessions WHERE expires_at < datetime(\'now\')')
  const jar = await cookies()
  jar.set(STAFF_COOKIE, token, { ...cookieBase, maxAge: STAFF_TTL_HOURS * 3600 })
}

export async function endStaffSession() {
  const jar = await cookies()
  const token = jar.get(STAFF_COOKIE)?.value
  if (token) run('DELETE FROM staff_sessions WHERE token_hash = ?', sha256(token))
  jar.delete(STAFF_COOKIE)
}

export async function currentStaff(): Promise<Staff | null> {
  const jar = await cookies()
  const token = jar.get(STAFF_COOKIE)?.value
  if (!token) return null
  return (
    get<Staff>(
      `SELECT s.id, s.username, s.name, s.role FROM staff_sessions ss
       JOIN staff s ON s.id = ss.staff_id
       WHERE ss.token_hash = ? AND ss.expires_at > datetime('now') AND s.active = 1`,
      sha256(token),
    ) ?? null
  )
}

/** Backend permission check. Always call this first in a protected handler. */
export async function requireStaff(...roles: Role[]): Promise<Staff> {
  const staff = await currentStaff()
  if (!staff) throw new ApiError(401, 'Please sign in', 'unauthenticated')
  if (roles.length && !roles.includes(staff.role)) throw new ApiError(403, 'You do not have permission to do this', 'forbidden')
  return staff
}

export const canManage = (r: Role) => r === 'admin' || r === 'manager'

// ---- customer table sessions ----
export type TableSession = {
  id: number
  table_id: number
  trusted: number
  source: string
  table_number: string
  location: string
}

export async function currentTableSession(): Promise<TableSession | null> {
  const jar = await cookies()
  const token = jar.get(TABLE_COOKIE)?.value
  if (!token) return null
  return (
    get<TableSession>(
      `SELECT ts.id, ts.table_id, ts.trusted, ts.source, t.number AS table_number, t.location
       FROM table_sessions ts JOIN tables t ON t.id = ts.table_id
       WHERE ts.token_hash = ? AND ts.closed_at IS NULL AND ts.expires_at > datetime('now') AND t.active = 1`,
      sha256(token),
    ) ?? null
  )
}

export async function openTableSession(
  tableId: number,
  source: 'qr' | 'manual' | 'waiter',
  ttlHours: number,
  createdBy: number | null = null,
) {
  const token = randomToken(32)
  // QR scans and waiter links prove physical presence; manual picks do not.
  const trusted = source === 'manual' ? 0 : 1
  run(
    `INSERT INTO table_sessions (token_hash, table_id, source, trusted, created_by, expires_at)
     VALUES (?, ?, ?, ?, ?, datetime('now', ?))`,
    sha256(token), tableId, source, trusted, createdBy, `+${ttlHours} hours`,
  )
  const jar = await cookies()
  jar.set(TABLE_COOKIE, token, { ...cookieBase, maxAge: ttlHours * 3600 })
}

export async function clearTableSession() {
  const jar = await cookies()
  const token = jar.get(TABLE_COOKIE)?.value
  if (token) run(`UPDATE table_sessions SET closed_at = datetime('now') WHERE token_hash = ?`, sha256(token))
  jar.delete(TABLE_COOKIE)
}

// ---- audit + notifications ----
export function audit(staff: Staff | null, actor: string, action: string, target = '', detail = '', ip = '') {
  run(
    'INSERT INTO audit_log (staff_id, actor, action, target, detail, ip) VALUES (?, ?, ?, ?, ?, ?)',
    staff?.id ?? null, actor, action, target, detail.slice(0, 1000), ip,
  )
}

export function staffByRole(role: Role) {
  return all<{ id: number }>('SELECT id FROM staff WHERE role = ? AND active = 1', role)
}
