import { ApiError, body, bool, int, json, route, str } from '@/lib/server/http'
import { audit, requireStaff } from '@/lib/server/auth'
import { get, run } from '@/lib/server/db'
import { loadMenu } from '@/lib/server/menu'

export const dynamic = 'force-dynamic'

export const GET = route(async () => {
  await requireStaff('manager', 'admin')
  return json({ categories: loadMenu(true) })
})

function fields(b: Record<string, unknown>) {
  return {
    name_en: str(b.nameEn, 'name', { required: true, max: 80 }),
    name_ku: str(b.nameKu, 'Kurdish name', { max: 80 }),
    name_ar: str(b.nameAr, 'Arabic name', { max: 80 }),
    icon: str(b.icon, 'icon', { max: 30 }),
  }
}

export const POST = route(async (req) => {
  const staff = await requireStaff('manager', 'admin')
  const f = fields(await body(req))
  const next = (get<{ m: number | null }>('SELECT MAX(sort) m FROM categories')!.m ?? -1) + 1
  const r = run('INSERT INTO categories (name_en, name_ku, name_ar, icon, sort) VALUES (?,?,?,?,?)', f.name_en, f.name_ku, f.name_ar, f.icon, next)
  audit(staff, staff.name, 'category.create', String(r.lastInsertRowid), f.name_en)
  return json({ id: Number(r.lastInsertRowid) }, { status: 201 })
})

export const PATCH = route(async (req) => {
  const staff = await requireStaff('manager', 'admin')
  const b = await body(req)
  const id = int(b.id, 'id', { min: 1 })!
  if (Array.isArray(b.order)) {
    // Reorder: array of category ids in the new order.
    (b.order as unknown[]).forEach((cid, i) => run('UPDATE categories SET sort = ? WHERE id = ?', i, int(cid, 'id', { min: 1 })!))
    audit(staff, staff.name, 'category.reorder')
    return json({ ok: true })
  }
  if (!get('SELECT 1 FROM categories WHERE id = ?', id)) throw new ApiError(404, 'Category not found', 'not_found')
  if (b.visible !== undefined && b.nameEn === undefined) run('UPDATE categories SET visible = ? WHERE id = ?', bool(b.visible), id)
  else {
    const f = fields(b)
    run('UPDATE categories SET name_en=?, name_ku=?, name_ar=?, icon=?, visible=? WHERE id=?', f.name_en, f.name_ku, f.name_ar, f.icon, b.visible === undefined ? 1 : bool(b.visible), id)
  }
  audit(staff, staff.name, 'category.update', String(id))
  return json({ ok: true })
})

export const DELETE = route(async (req) => {
  const staff = await requireStaff('manager', 'admin')
  const id = int(new URL(req.url).searchParams.get('id'), 'id', { min: 1 })!
  const n = get<{ c: number }>('SELECT COUNT(*) c FROM items WHERE category_id = ?', id)!.c
  if (n) throw new ApiError(409, `This category still has ${n} item(s). Move or delete them first, or hide the category instead.`, 'not_empty')
  run('DELETE FROM categories WHERE id = ?', id)
  audit(staff, staff.name, 'category.delete', String(id))
  return json({ ok: true })
})
