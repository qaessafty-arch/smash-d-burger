import 'server-only'
import { all } from './db'

type Cat = { id: number; name_en: string; name_ku: string; name_ar: string; icon: string; sort: number; visible: number }
type Item = {
  id: number; category_id: number; name_en: string; name_ku: string; name_ar: string; desc_en: string; desc_ku: string; desc_ar: string
  price: number; image: string; prep_minutes: number | null; badge: string; spicy: number; featured: number; popular: number
  offer_price: number | null; offer_label: string; ingredients: string; allergens: string; available: number; visible: number; sort: number
}
type Group = { id: number; item_id: number; name_en: string; name_ku: string; name_ar: string; kind: string; required: number; min_select: number; max_select: number; sort: number }
type Opt = { id: number; group_id: number; name_en: string; name_ku: string; name_ar: string; price_delta: number; is_default: number; available: number; sort: number }

const parse = (s: string): string[] => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : [] } catch { return [] } }

/** Full menu tree. `admin` includes hidden/unavailable entries and raw ids for editing. */
export function loadMenu(admin = false) {
  const cats = all<Cat>(`SELECT * FROM categories ${admin ? '' : 'WHERE visible = 1'} ORDER BY sort, id`)
  const items = all<Item>(`SELECT * FROM items ${admin ? '' : 'WHERE visible = 1'} ORDER BY sort, id`)
  const groups = all<Group>('SELECT * FROM option_groups ORDER BY sort, id')
  const opts = all<Opt>(`SELECT * FROM options ${admin ? '' : 'WHERE available = 1'} ORDER BY sort, id`)
  // Real popularity: units sold in non-cancelled orders
  const sold = new Map(
    all<{ item_id: number; q: number }>(
      `SELECT oi.item_id, SUM(oi.quantity) q FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.status NOT IN ('cancelled','rejected') AND oi.item_id IS NOT NULL GROUP BY oi.item_id`,
    ).map((r) => [r.item_id, r.q]),
  )
  const topIds = new Set([...sold.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).filter(([, q]) => q >= 3).map(([id]) => id))

  return cats.map((c) => ({
    id: c.id, name: { en: c.name_en, ku: c.name_ku, ar: c.name_ar }, icon: c.icon, sort: c.sort, visible: !!c.visible,
    items: items.filter((i) => i.category_id === c.id).map((i) => ({
      id: i.id, categoryId: i.category_id,
      name: { en: i.name_en, ku: i.name_ku, ar: i.name_ar },
      desc: { en: i.desc_en, ku: i.desc_ku, ar: i.desc_ar },
      price: i.price, offerPrice: i.offer_price, offerLabel: i.offer_label, image: i.image, prepMinutes: i.prep_minutes,
      badge: i.badge, spicy: !!i.spicy, featured: !!i.featured,
      popular: !!i.popular || topIds.has(i.id), unitsSold: admin ? sold.get(i.id) ?? 0 : undefined,
      ingredients: parse(i.ingredients), allergens: parse(i.allergens), available: !!i.available, visible: !!i.visible, sort: i.sort,
      groups: groups.filter((g) => g.item_id === i.id).map((g) => ({
        id: g.id, name: { en: g.name_en, ku: g.name_ku, ar: g.name_ar }, kind: g.kind as 'single' | 'multi',
        required: !!g.required, min: g.min_select, max: g.max_select, sort: g.sort,
        options: opts.filter((o) => o.group_id === g.id).map((o) => ({
          id: o.id, name: { en: o.name_en, ku: o.name_ku, ar: o.name_ar }, priceDelta: o.price_delta,
          isDefault: !!o.is_default, available: !!o.available, sort: o.sort,
        })),
      })),
    })),
  }))
}
