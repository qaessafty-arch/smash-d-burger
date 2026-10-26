import 'server-only'
import { ApiError, bool, int, str } from './http'
import { audit, type Staff } from './auth'
import { get, run, tx, all } from './db'

type Obj = Record<string, unknown>
const arr = (v: unknown, field: string, max: number): unknown[] => {
  if (v === undefined || v === null) return []
  if (!Array.isArray(v) || v.length > max) throw new ApiError(400, `${field} is invalid`, 'invalid')
  return v
}
const names = (v: unknown, field: string, max = 120) => {
  const o = (v ?? {}) as Obj
  return { en: str(o.en, `${field} (English)`, { required: true, max }), ku: str(o.ku, `${field} (Kurdish)`, { max }), ar: str(o.ar, `${field} (Arabic)`, { max }) }
}

function itemFields(b: Obj) {
  const n = names(b.name, 'name')
  const d = (b.desc ?? {}) as Obj
  const strList = (v: unknown, f: string) => arr(v, f, 40).map((x) => str(x, f, { required: true, max: 80 }))
  const offer = int(b.offerPrice, 'offer price', { min: 0, required: false })
  return {
    category_id: int(b.categoryId, 'category', { min: 1 })!,
    name_en: n.en, name_ku: n.ku, name_ar: n.ar,
    desc_en: str(d.en, 'description', { max: 600 }), desc_ku: str(d.ku, 'description', { max: 600 }), desc_ar: str(d.ar, 'description', { max: 600 }),
    price: int(b.price, 'price', { min: 0 })!, offer_price: offer, offer_label: str(b.offerLabel, 'offer label', { max: 40 }),
    image: str(b.image, 'image', { max: 500 }), prep_minutes: int(b.prepMinutes, 'preparation time', { min: 1, max: 240, required: false }),
    badge: str(b.badge, 'badge', { max: 30 }), spicy: bool(b.spicy), featured: bool(b.featured), popular: bool(b.popular),
    ingredients: JSON.stringify(strList(b.ingredients, 'ingredient')), allergens: JSON.stringify(strList(b.allergens, 'allergen')),
    available: b.available === undefined ? 1 : bool(b.available), visible: b.visible === undefined ? 1 : bool(b.visible),
  }
}

function writeGroups(itemId: number, groupsIn: unknown[]) {
  const keepGroups: number[] = []
  groupsIn.forEach((gRaw, gi) => {
    const g = gRaw as Obj
    const n = names(g.name, 'group name', 80)
    const kind = g.kind === 'multi' ? 'multi' : 'single'
    const required = bool(g.required)
    const optsIn = arr(g.options, 'options', 60)
    if (!optsIn.length) throw new ApiError(400, `Group "${n.en}" needs at least one option`, 'invalid')
    const max = kind === 'single' ? 1 : int(g.max, 'max choices', { min: 1, max: 60, required: false }) ?? optsIn.length
    const min = required ? Math.max(1, int(g.min, 'min choices', { min: 0, max: 60, required: false }) ?? 1) : 0
    let gid = int(g.id, 'group id', { min: 1, required: false })
    if (gid && get('SELECT 1 FROM option_groups WHERE id = ? AND item_id = ?', gid, itemId)) {
      run('UPDATE option_groups SET name_en=?, name_ku=?, name_ar=?, kind=?, required=?, min_select=?, max_select=?, sort=? WHERE id=?',
        n.en, n.ku, n.ar, kind, required, min, max, gi, gid)
    } else {
      gid = Number(run('INSERT INTO option_groups (item_id, name_en, name_ku, name_ar, kind, required, min_select, max_select, sort) VALUES (?,?,?,?,?,?,?,?,?)',
        itemId, n.en, n.ku, n.ar, kind, required, min, max, gi).lastInsertRowid)
    }
    keepGroups.push(gid)
    const keepOpts: number[] = []
    optsIn.forEach((oRaw, oi) => {
      const o = oRaw as Obj
      const on = names(o.name, 'option name', 80)
      const delta = int(o.priceDelta, 'option price', { min: -10_000_000, max: 10_000_000, required: false }) ?? 0
      let oid = int(o.id, 'option id', { min: 1, required: false })
      if (oid && get('SELECT 1 FROM options WHERE id = ? AND group_id = ?', oid, gid)) {
        run('UPDATE options SET name_en=?, name_ku=?, name_ar=?, price_delta=?, is_default=?, available=?, sort=? WHERE id=?',
          on.en, on.ku, on.ar, delta, bool(o.isDefault), o.available === undefined ? 1 : bool(o.available), oi, oid)
      } else {
        oid = Number(run('INSERT INTO options (group_id, name_en, name_ku, name_ar, price_delta, is_default, available, sort) VALUES (?,?,?,?,?,?,?,?)',
          gid, on.en, on.ku, on.ar, delta, bool(o.isDefault), o.available === undefined ? 1 : bool(o.available), oi).lastInsertRowid)
      }
      keepOpts.push(oid)
    })
    const existing = all<{ id: number }>('SELECT id FROM options WHERE group_id = ?', gid)
    for (const e of existing) if (!keepOpts.includes(e.id)) run('DELETE FROM options WHERE id = ?', e.id)
  })
  const existingGroups = all<{ id: number }>('SELECT id FROM option_groups WHERE item_id = ?', itemId)
  for (const e of existingGroups) if (!keepGroups.includes(e.id)) run('DELETE FROM option_groups WHERE id = ?', e.id)
}

export function createItem(staff: Staff, b: Obj) {
  const f = itemFields(b)
  const groups = arr(b.groups, 'groups', 20)
  const id = tx(() => {
    if (!get('SELECT 1 FROM categories WHERE id = ?', f.category_id)) throw new ApiError(400, 'Choose a category', 'invalid')
    const sort = (get<{ m: number | null }>('SELECT MAX(sort) m FROM items WHERE category_id = ?', f.category_id)!.m ?? -1) + 1
    const cols = Object.keys(f)
    const r = run(`INSERT INTO items (${cols.join(',')}, sort) VALUES (${cols.map(() => '?').join(',')}, ?)`, ...Object.values(f), sort)
    const itemId = Number(r.lastInsertRowid)
    writeGroups(itemId, groups)
    return itemId
  })
  audit(staff, staff.name, 'item.create', String(id), String(f.name_en))
  return id
}

export function saveItem(staff: Staff, id: number, b: Obj) {
  const f = itemFields(b)
  const groups = arr(b.groups, 'groups', 20)
  tx(() => {
    if (!get('SELECT 1 FROM items WHERE id = ?', id)) throw new ApiError(404, 'Item not found', 'not_found')
    if (!get('SELECT 1 FROM categories WHERE id = ?', f.category_id)) throw new ApiError(400, 'Choose a category', 'invalid')
    const cols = Object.keys(f)
    run(`UPDATE items SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, ...Object.values(f), id)
    writeGroups(id, groups)
  })
  audit(staff, staff.name, 'item.update', String(id), String(f.name_en))
}
