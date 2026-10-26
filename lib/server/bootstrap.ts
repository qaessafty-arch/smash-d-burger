import 'server-only'
import type { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { hashPassword, randomToken } from './security'

/**
 * First-boot setup. Everything here is idempotent and only runs against empty tables:
 *  - default settings
 *  - the restaurant's existing menu (seed/menu.json, extracted from the original site)
 *  - customization groups that mirror what the original customizer offered
 *  - one administrator account
 */

export interface Settings {
  restaurantName: string; tagline: string; description: string; logoUrl: string; coverUrl: string
  currency: string; taxPercent: number; servicePercent: number; timezone: string
  hours: Array<{ day: string; open: string; close: string; closed: boolean }>
  orderingEnabled: boolean; requireVerification: boolean; kitchenNeedsVerified: boolean; waiterCanSkipKitchen: boolean
  manualTableMode: 'open' | 'waiter_only' | 'off'
  verifyTtlMinutes: number; tableSessionHours: number; requestTypes: string[]; soundAlerts: boolean
  languages: string[]; whatsapp: string
  deliveryEnabled: boolean; notice: string
}

export const DEFAULT_SETTINGS: Settings = {
  restaurantName: 'Smashed Burger',
  tagline: "Erbil's boldest smash burger",
  description:
    "Erbil's boldest smash burgers. 100% fresh beef, crispy edges, melted cheese. Dine-in, takeaway & delivery in Erbil.",
  logoUrl: '',
  coverUrl: '/smashed-burger-hero.png',
  currency: 'IQD',
  taxPercent: 0,
  servicePercent: 0,
  timezone: 'Asia/Baghdad',
  hours: [
    { day: 'sun', open: '11:00', close: '24:00', closed: false },
    { day: 'mon', open: '11:00', close: '24:00', closed: false },
    { day: 'tue', open: '11:00', close: '24:00', closed: false },
    { day: 'wed', open: '11:00', close: '24:00', closed: false },
    { day: 'thu', open: '11:00', close: '24:00', closed: false },
    { day: 'fri', open: '14:00', close: '24:00', closed: false },
    { day: 'sat', open: '11:00', close: '24:00', closed: false },
  ],
  orderingEnabled: true,
  requireVerification: true,
  kitchenNeedsVerified: true,
  waiterCanSkipKitchen: false,
  manualTableMode: 'open', // open | waiter_only | off
  verifyTtlMinutes: 90,
  tableSessionHours: 6,
  requestTypes: ['waiter', 'water', 'utensils', 'napkins', 'bill'],
  soundAlerts: true,
  languages: ['EN', 'KU', 'AR'],
  whatsapp: '9647500000000',
  deliveryEnabled: true,
  notice: '',
}

type SeedItem = { name: string; desc: string; price: number; image: string; badge: string; spicy: boolean }
type SeedCat = { name: string; items: SeedItem[] }

const CATEGORY_I18N: Record<string, { ku: string; ar: string; icon: string }> = {
  'Meat Burgers': { ku: 'بەرگەری گۆشت', ar: 'برجر اللحم', icon: 'burger' },
  'Chicken Burgers': { ku: 'بەرگەری مریشک', ar: 'برجر الدجاج', icon: 'drumstick' },
  Sides: { ku: 'خواردنی لاوەکی', ar: 'المقبلات', icon: 'shrimp' },
  Fries: { ku: 'پەتاتە', ar: 'البطاطس', icon: 'fries' },
  Drinks: { ku: 'خواردنەوە', ar: 'المشروبات', icon: 'drink' },
}

// Ingredient lists from the original customizer (used for "remove ingredient" options).
const INGREDIENTS: Record<string, string[]> = {
  'All American': ['Single Smashed Beef Patty', 'American Cheese', 'Ketchup', 'Mustard', 'Raw Onions', 'Pickles', 'House Sauce'],
  'OG Smash': ['Single Smashed Beef Patty', 'American Cheese', 'House Sauce', 'Pickles', 'Caramelized Onions'],
  Jalapeño: ['Single Smashed Beef Patty', 'American Cheese', 'House Sauce', 'Caramelized Onions', 'Fresh Jalapeños'],
  'Golden Crunch': ['Crispy Chicken', 'American Cheese', 'Lettuce', 'Tomato', 'House Sauce'],
  'Hot Chicken': ['Crispy Chicken', 'American Cheese', 'Lettuce', 'Tomato', 'Spicy Sauce'],
  'Sweet Heat': ['Crispy Chicken', 'American Cheese', 'Lettuce', 'Tomato', 'Sweet Spicy Sauce'],
  'Loaded Fries': ['Crispy Fries', 'Melted Cheese', 'Caramelized Onions', 'Jalapeños', 'House Sauce'],
  'Crispy Chicken Tenders (5 pcs)': ['5 Pcs Crispy Chicken Tenders', 'House Dipping Sauce'],
  'Dynamite Shrimps (7 pcs)': ['7 Pcs Crispy Shrimps', 'Spicy Dynamite Sauce'],
  'Jalapeño Poppers (7 pcs)': ['7 Pcs Jalapeño Poppers', 'Mixed Molten Cheese Filling'],
  'Chicken Popcorn': ['Bite-Sized Crispy Chicken', 'House Dipping Sauce'],
  'Classic Fries': ['Crispy French Fries', 'Sea Salt'],
  'Curly Fries': ['Golden Curly Fries', 'House Spice Seasoning'],
  'Seasoned Fries': ['Crispy French Fries', 'Cajun Herb Spice Blend'],
}

const FEATURED = new Set(['OG Smash', 'All American', 'Golden Crunch', 'Dynamite Shrimps (7 pcs)'])
const POPULAR = new Set(['All American', 'OG Smash', 'Curly Fries'])

const BURGER_EXTRAS: Array<[string, number]> = [
  ['Extra Patty (Smashed Beef)', 1500],
  ['Extra American Cheese', 1000],
  ['Caramelized Onions', 500],
  ['Fresh Jalapeños', 500],
  ['Extra House Sauce (in burger)', 500],
  ['Extra Spicy Sauce (in burger)', 500],
  ['Side Dip: House Sauce', 500],
  ['Side Dip: Dynamite Sauce', 1000],
  ['Side Dip: Melted Cheddar', 1000],
]

export function bootstrap(conn: DatabaseSync) {
  const count = (t: string) => (conn.prepare(`SELECT COUNT(*) c FROM ${t}`).get() as { c: number }).c

  conn.exec('BEGIN IMMEDIATE')
  try {
    if (count('settings') === 0) {
      const ins = conn.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
      for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) ins.run(k, JSON.stringify(v))
    }
    if (count('categories') === 0) seedMenu(conn)
    if (count('staff') === 0) seedAdmin(conn)
    conn.exec('COMMIT')
  } catch (e) {
    conn.exec('ROLLBACK')
    throw e
  }
}

function seedMenu(conn: DatabaseSync) {
  const file = path.join(process.cwd(), 'seed', 'menu.json')
  if (!fs.existsSync(file)) return
  const data = JSON.parse(fs.readFileSync(file, 'utf8')) as { categories: SeedCat[] }

  const insCat = conn.prepare('INSERT INTO categories (name_en, name_ku, name_ar, icon, sort) VALUES (?,?,?,?,?)')
  const insItem = conn.prepare(
    `INSERT INTO items (category_id, name_en, desc_en, price, image, badge, spicy, featured, popular, ingredients, sort)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  )
  const insGroup = conn.prepare(
    'INSERT INTO option_groups (item_id, name_en, name_ku, name_ar, kind, required, min_select, max_select, sort) VALUES (?,?,?,?,?,?,?,?,?)',
  )
  const insOpt = conn.prepare(
    'INSERT INTO options (group_id, name_en, price_delta, is_default, sort) VALUES (?,?,?,?,?)',
  )

  const group = (
    itemId: number, sort: number, en: string, ku: string, ar: string,
    kind: 'single' | 'multi', required: boolean, max: number,
    opts: Array<[string, number, boolean?]>,
  ) => {
    const g = insGroup.run(itemId, en, ku, ar, kind, required ? 1 : 0, required ? 1 : 0, max, sort)
    opts.forEach(([name, delta, def], i) => insOpt.run(Number(g.lastInsertRowid), name, delta, def ? 1 : 0, i))
  }

  data.categories.forEach((cat, ci) => {
    const i18n = CATEGORY_I18N[cat.name] ?? { ku: '', ar: '', icon: '' }
    const c = insCat.run(cat.name, i18n.ku, i18n.ar, i18n.icon, ci)
    const categoryId = Number(c.lastInsertRowid)

    cat.items.forEach((item, ii) => {
      const ingredients = INGREDIENTS[item.name] ?? []
      const r = insItem.run(
        categoryId, item.name, item.desc, item.price, item.image, item.badge,
        item.spicy ? 1 : 0, FEATURED.has(item.name) ? 1 : 0, POPULAR.has(item.name) ? 1 : 0,
        JSON.stringify(ingredients), ii,
      )
      const itemId = Number(r.lastInsertRowid)

      if (cat.name === 'Meat Burgers' || cat.name === 'Chicken Burgers') {
        if (ingredients.length)
          group(itemId, 0, 'Remove ingredients', 'لابردنی پێکهاتەکان', 'إزالة المكونات', 'multi', false, ingredients.length,
            ingredients.map((n) => [`No ${n}`, 0]))
        group(itemId, 1, 'Sauce level', 'ئاستی سۆس', 'كمية الصوص', 'single', true, 1,
          [['Normal', 0, true], ['Extra', 0], ['Light', 0], ['On The Side', 0]])
        group(itemId, 2, 'Extras & upgrades', 'زیادکراوەکان', 'الإضافات', 'multi', false, BURGER_EXTRAS.length, BURGER_EXTRAS)
      } else if (cat.name === 'Sides') {
        group(itemId, 0, 'Portion size', 'قەبارەی بەشەکە', 'حجم الوجبة', 'single', true, 1,
          [['Regular', 0, true], ['Large', 1500]])
        group(itemId, 1, 'Seasoning', 'بەهارات', 'التوابل', 'single', true, 1,
          [['Classic Sea Salt', 0, true], ['Smoky Cajun', 0], ['Rosemary Garlic', 0]])
        group(itemId, 2, 'Dip', 'سۆسی تەنیشت', 'الصوص الجانبي', 'single', true, 1,
          [['House Smash Sauce', 0, true], ['Spicy Mayo', 0], ['Garlic Mayo', 0], ['Melted Cheddar', 1000]])
      } else if (cat.name === 'Fries') {
        group(itemId, 0, 'Seasoning', 'بەهارات', 'التوابل', 'single', true, 1,
          [['Classic Sea Salt', 0, true], ['Smoky Cajun', 0], ['Garlic & Herb', 0]])
      } else if (cat.name === 'Drinks' && item.name !== 'Mineral Water') {
        group(itemId, 0, 'Ice', '', 'الثلج', 'single', true, 1,
          [['Normal Ice', 0, true], ['Extra Ice', 0], ['No Ice', 0]])
      }
    })
  })
}

function seedAdmin(conn: DatabaseSync) {
  const username = process.env.ADMIN_USERNAME || 'admin'
  let password = process.env.ADMIN_PASSWORD
  let generated = false
  if (!password) {
    password = randomToken(9)
    generated = true
  }
  conn
    .prepare("INSERT INTO staff (username, name, role, password_hash) VALUES (?, 'Administrator', 'admin', ?)")
    .run(username, hashPassword(password))
  if (generated) {
    console.warn(
      `\n[smash-d-burger] First run: created administrator account.\n  username: ${username}\n  password: ${password}\n  (set ADMIN_USERNAME / ADMIN_PASSWORD before first start to choose your own; change it in Admin > Staff)\n`,
    )
  }
}
