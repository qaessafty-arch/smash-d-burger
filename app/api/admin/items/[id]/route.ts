import { ApiError, body, bool, int, json, route } from '@/lib/server/http'
import { audit, requireStaff } from '@/lib/server/auth'
import { get, run } from '@/lib/server/db'
import { saveItem } from '@/lib/server/admin-items'

export const PUT = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff('manager', 'admin')
  const id = int((await ctx.params).id, 'id', { min: 1 })!
  saveItem(staff, id, await body(req))
  return json({ ok: true })
})

/** Quick toggles from the menu list: availability, visibility, price. */
export const PATCH = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff('manager', 'admin')
  const id = int((await ctx.params).id, 'id', { min: 1 })!
  const b = await body(req)
  if (!get('SELECT 1 FROM items WHERE id = ?', id)) throw new ApiError(404, 'Item not found', 'not_found')
  if (b.available !== undefined) run('UPDATE items SET available = ? WHERE id = ?', bool(b.available), id)
  if (b.visible !== undefined) run('UPDATE items SET visible = ? WHERE id = ?', bool(b.visible), id)
  if (b.price !== undefined) run('UPDATE items SET price = ? WHERE id = ?', int(b.price, 'price', { min: 0 })!, id)
  audit(staff, staff.name, 'item.patch', String(id), JSON.stringify(b).slice(0, 200))
  return json({ ok: true })
})

export const DELETE = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff('manager', 'admin')
  const id = int((await ctx.params).id, 'id', { min: 1 })!
  run('DELETE FROM items WHERE id = ?', id) // past orders keep their own name/price snapshot
  audit(staff, staff.name, 'item.delete', String(id))
  return json({ ok: true })
})
