// End-to-end API tests. Run against a server started with a throwaway DATABASE_PATH:
//   DATABASE_PATH=/tmp/t.db ADMIN_PASSWORD='Admin#12345' INSECURE_COOKIES=1 pnpm dev -p 3100
//   BASE=http://localhost:3100 DATABASE_PATH=/tmp/t.db pnpm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import crypto from 'node:crypto'

const BASE = process.env.BASE || 'http://localhost:3100'
const DB = process.env.DATABASE_PATH
const ADMIN = { username: 'admin', password: process.env.ADMIN_PASSWORD || 'Admin#12345' }
const sql = () => new DatabaseSync(DB)

function client() {
  const jar = new Map()
  const api = async (method, path, body, { headers = {}, raw = false, redirect = 'manual', form } = {}) => {
    const h = { ...headers }
    if (jar.size) h.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
    let payload
    if (form) payload = form
    else if (body !== undefined) { h['content-type'] = 'application/json'; payload = JSON.stringify(body) }
    const res = await fetch(BASE + path, { method, headers: h, body: payload, redirect })
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(';'); const i = pair.indexOf('=')
      const name = pair.slice(0, i), val = pair.slice(i + 1)
      if (/Max-Age=0|expires=Thu, 01 Jan 1970/i.test(c) || val === '') jar.delete(name); else jar.set(name, val)
    }
    if (raw) return res
    const text = await res.text()
    let data; try { data = JSON.parse(text) } catch { data = text }
    return { status: res.status, data, headers: res.headers }
  }
  return { api, jar }
}

const S = {} // shared state across ordered tests
const idem = () => crypto.randomUUID()

async function login(c, creds) {
  const r = await c.api('POST', '/api/staff/login', creds)
  assert.equal(r.status, 200, JSON.stringify(r.data))
  return r.data.staff
}
async function scan(c, qrUrl) {
  const path = new URL(qrUrl).pathname
  const r = await c.api('GET', path)
  assert.equal(r.status, 307)
  return r
}
const menuItem = (menu, name) => menu.categories.flatMap((c) => c.items).find((i) => i.name.en === name)

test('setup: admin signs in, creates tables and staff', async () => {
  S.admin = client()
  const staff = await login(S.admin, ADMIN)
  assert.equal(staff.role, 'admin')
  const r = await S.admin.api('POST', '/api/admin/tables', { count: 4, start: 1, location: 'Main hall' })
  assert.equal(r.status, 201)
  for (const [u, role] of [['waiter1', 'waiter'], ['waiter2', 'waiter'], ['cook1', 'kitchen'], ['boss1', 'manager']]) {
    const c = await S.admin.api('POST', '/api/admin/staff', { username: u, name: u, role, password: 'Password#1234' })
    assert.equal(c.status, 201, JSON.stringify(c.data))
  }
  const t = await S.admin.api('GET', '/api/admin/tables')
  S.tables = t.data.tables
  assert.equal(S.tables.length >= 4, true)
  S.waiter = client(); await login(S.waiter, { username: 'waiter1', password: 'Password#1234' })
  S.waiter2 = client(); await login(S.waiter2, { username: 'waiter2', password: 'Password#1234' })
  S.kitchen = client(); await login(S.kitchen, { username: 'cook1', password: 'Password#1234' })
  S.manager = client(); await login(S.manager, { username: 'boss1', password: 'Password#1234' })
})

test('menu: existing restaurant menu is served from the database', async () => {
  const c = client()
  const r = await c.api('GET', '/api/menu')
  assert.equal(r.status, 200)
  S.menu = r.data
  assert.equal(r.data.categories.length, 5)
  assert.equal(r.data.categories.flatMap((x) => x.items).length, 18)
  const og = menuItem(r.data, 'OG Smash')
  assert.equal(og.price, 8500)
  assert.ok(og.groups.length >= 2)
  assert.equal(JSON.stringify(r.data).includes('verify'), false)
})

test('customer cannot order without a table session', async () => {
  const c = client()
  const og = menuItem(S.menu, 'OG Smash')
  const r = await c.api('POST', '/api/orders', { lines: [{ itemId: og.id, quantity: 1 }], idempotencyKey: idem() })
  assert.equal(r.status, 403)
  assert.equal(r.data.code, 'no_table')
})

test('QR: invalid table QR is rejected, valid one opens the right table', async () => {
  const bad = client()
  const r1 = await bad.api('GET', '/t/not-a-real-token-1234567')
  assert.match(r1.headers.get('location'), /table=invalid/)
  S.cust = client()
  await scan(S.cust, S.tables[0].qrUrl)
  const s = await S.cust.api('GET', '/api/session')
  assert.equal(s.data.table.number, S.tables[0].number)
  assert.equal(s.data.table.trusted, true)
})

test('pricing: server computes totals and rejects tampering', async () => {
  const og = menuItem(S.menu, 'OG Smash')
  const extras = og.groups.find((g) => g.name.en.startsWith('Extras'))
  const patty = extras.options.find((o) => o.name.en.includes('Extra Patty'))
  const q = await S.cust.api('POST', '/api/orders/quote', { lines: [{ itemId: og.id, quantity: 2, optionIds: [patty.id], price: 1, unitPrice: 1, total: 1 }] })
  assert.equal(q.status, 200)
  assert.equal(q.data.total, (8500 + 1500) * 2) // client-supplied price fields are ignored
  const bad = [
    [{ itemId: og.id, quantity: 0 }], [{ itemId: og.id, quantity: 51 }], [{ itemId: og.id, quantity: 1.5 }],
    [{ itemId: 999999, quantity: 1 }], [{ itemId: og.id, quantity: 1, optionIds: [999999] }],
    [{ itemId: og.id, quantity: 1, optionIds: [patty.id, patty.id] }], [],
  ]
  for (const lines of bad) {
    const r = await S.cust.api('POST', '/api/orders/quote', { lines })
    assert.equal(r.status, 400, JSON.stringify(lines))
  }
  // an option belonging to a different item is rejected
  const fries = menuItem(S.menu, 'Classic Fries')
  const r = await S.cust.api('POST', '/api/orders/quote', { lines: [{ itemId: fries.id, quantity: 1, optionIds: [patty.id] }] })
  assert.equal(r.status, 400)
})

test('customer submits an order and gets number, code and QR token', async () => {
  const og = menuItem(S.menu, 'OG Smash')
  const extras = og.groups.find((g) => g.name.en.startsWith('Extras'))
  const patty = extras.options.find((o) => o.name.en.includes('Extra Patty'))
  const remove = og.groups.find((g) => g.name.en === 'Remove ingredients').options[0]
  S.key1 = idem()
  const lines = [{ itemId: og.id, quantity: 2, optionIds: [patty.id, remove.id], instructions: 'no napkins please' }]
  const r = await S.cust.api('POST', '/api/orders', { lines, note: 'Table by the window', idempotencyKey: S.key1 })
  assert.equal(r.status, 201, JSON.stringify(r.data))
  S.track1 = r.data.trackToken
  const dup = await S.cust.api('POST', '/api/orders', { lines, idempotencyKey: S.key1 })
  assert.equal(dup.status, 409) // duplicate submission does not create a second order
  const v = await S.cust.api('GET', `/api/orders/${S.track1}`)
  const o = v.data.order
  S.order1 = o
  assert.equal(o.status, 'awaiting_verification')
  assert.match(o.label, /^ORD-\d+$/)
  assert.match(o.verifyCode, /^\d{6}$/)
  assert.ok(o.verifyToken.length >= 30)
  assert.equal(o.total, 20000)
  assert.equal(o.tableNumber, S.tables[0].number)
  assert.equal(o.items[0].options.length, 3) // 2 chosen + required 'Sauce level' falls back to its default
  const count = sql().prepare('SELECT COUNT(*) c FROM orders').get().c
  assert.equal(count, 1)
})

test('security: tracking token is a secret; other customers cannot read orders', async () => {
  const other = client()
  assert.equal((await other.api('GET', `/api/orders/${S.track1}x`)).status, 404)
  assert.equal((await other.api('GET', `/api/orders/${S.order1.id}`)).status, 404) // public id is not a credential
  assert.equal((await other.api('GET', '/api/orders/short')).status, 404)
  const stored = sql().prepare('SELECT track_token_hash, verify_code FROM orders').get()
  assert.notEqual(stored.track_token_hash, S.track1)
})

test('waiter: auth and role checks guard verification', async () => {
  const anon = client()
  assert.equal((await anon.api('POST', '/api/staff/verify', { code: S.order1.verifyCode })).status, 401)
  assert.equal((await S.kitchen.api('POST', '/api/staff/verify', { code: S.order1.verifyCode })).status, 403)
  assert.equal((await anon.api('GET', '/api/staff/orders')).status, 401)
  assert.equal((await S.kitchen.api('GET', '/api/staff/orders')).status, 403)
  assert.equal((await S.waiter.api('GET', '/api/admin/stats')).status, 403)
  assert.equal((await S.waiter.api('GET', '/api/admin/staff')).status, 403)
  assert.equal((await S.manager.api('GET', '/api/admin/staff')).status, 403)
  assert.equal((await S.manager.api('GET', '/api/admin/stats')).status, 200)
})

test('kitchen never sees unverified orders', async () => {
  const k = await S.kitchen.api('GET', '/api/staff/kitchen')
  assert.equal(k.data.orders.length, 0)
})

test('verification code: wrong code, preview, wrong order, success, replay', async () => {
  const wrong = S.order1.verifyCode === '000000' ? '111111' : '000000'
  const w = await S.waiter.api('POST', '/api/staff/verify', { code: wrong })
  assert.equal(w.status, 404)
  const p = await S.waiter.api('POST', '/api/staff/verify', { code: S.order1.verifyCode })
  assert.equal(p.status, 200)
  assert.equal(p.data.order.tableNumber, S.tables[0].number)
  assert.equal(p.data.order.total, 20000)
  assert.equal(p.data.order.items.length, 1)
  const still = await S.cust.api('GET', `/api/orders/${S.track1}`)
  assert.equal(still.data.order.status, 'awaiting_verification') // preview did not change anything
  const mismatch = await S.waiter.api('POST', `/api/staff/orders/someotherid/verify`, { code: S.order1.verifyCode })
  assert.equal(mismatch.status, 409)
  const ok = await S.waiter.api('POST', `/api/staff/orders/${S.order1.id}/verify`, { code: S.order1.verifyCode })
  assert.equal(ok.status, 200, JSON.stringify(ok.data))
  assert.equal(ok.data.order.status, 'verified')
  assert.equal(ok.data.order.verifiedBy, 'waiter1')
  const replay = await S.waiter2.api('POST', '/api/staff/verify', { code: S.order1.verifyCode })
  assert.equal(replay.status, 404) // code is spent
  const replayTok = await S.waiter2.api('POST', '/api/staff/verify', { token: S.order1.verifyToken })
  assert.equal(replayTok.status, 409)
  assert.equal(replayTok.data.code, 'already_verified')
  const view = await S.cust.api('GET', `/api/orders/${S.track1}`)
  assert.equal(view.data.order.verifyCode, null)
  assert.equal(view.data.order.verifyToken, null)
})

test('workflow: confirm -> kitchen -> ready -> served -> completed with role gates', async () => {
  const id = S.order1.id
  const t = (c, to, extra = {}) => c.api('POST', `/api/staff/orders/${id}/transition`, { to, ...extra })
  assert.equal((await t(S.kitchen, 'confirmed')).status, 403) // kitchen cannot confirm
  assert.equal((await t(S.waiter, 'ready')).status, 409) // cannot skip steps
  assert.equal((await t(S.waiter, 'completed')).status, 409)
  assert.equal((await t(S.waiter, 'confirmed')).status, 200)
  assert.equal((await t(S.waiter, 'preparing')).status, 403) // only kitchen prepares
  const k = await S.kitchen.api('GET', '/api/staff/kitchen')
  assert.equal(k.data.orders.length, 1)
  assert.equal(k.data.orders[0].items[0].instructions, 'no napkins please')
  assert.equal((await t(S.kitchen, 'preparing')).status, 200)
  assert.equal((await t(S.kitchen, 'ready')).status, 200)
  const n = await S.waiter.api('GET', '/api/staff/notifications?after=0')
  assert.ok(n.data.notifications.some((x) => x.kind === 'ready'))
  const view = await S.cust.api('GET', `/api/orders/${S.track1}`)
  assert.equal(view.data.order.status, 'ready')
  assert.equal((await t(S.kitchen, 'served')).status, 403)
  assert.equal((await t(S.waiter, 'served')).status, 200)
  assert.equal((await t(S.waiter, 'completed')).status, 200)
  const hist = await S.manager.api('GET', `/api/staff/orders/${id}`)
  assert.deepEqual(hist.data.order.timeline.map((h) => h.to), ['awaiting_verification', 'verified', 'confirmed', 'preparing', 'ready', 'served', 'completed'])
  assert.equal(hist.data.order.timeline.at(-1).by.startsWith('waiter1'), true)
})

test('QR verification path with token; expired token; reissue', async () => {
  const og = menuItem(S.menu, 'Classic Fries')
  const mk = async (c) => {
    const r = await c.api('POST', '/api/orders', { lines: [{ itemId: og.id, quantity: 1 }], idempotencyKey: idem() })
    assert.equal(r.status, 201, JSON.stringify(r.data))
    return (await c.api('GET', `/api/orders/${r.data.trackToken}`)).data.order
  }
  const o = await mk(S.cust)
  const pv = await S.waiter.api('POST', '/api/staff/verify', { token: 'x'.repeat(32) })
  assert.equal(pv.status, 404)
  // expire it
  sql().prepare(`UPDATE orders SET verify_expires_at = datetime('now','-1 minutes') WHERE public_id = ?`).run(o.id)
  const exp = await S.waiter.api('POST', '/api/staff/verify', { token: o.verifyToken })
  assert.equal(exp.status, 410)
  assert.equal(exp.data.code, 'expired')
  const ex2 = await S.waiter.api('POST', '/api/staff/verify', { code: o.verifyCode })
  assert.equal(ex2.status, 410)
  // waiter issues a fresh code
  const re = await S.waiter.api('POST', `/api/staff/orders/${o.id}/reissue`)
  assert.match(re.data.code, /^\d{6}$/)
  const ok = await S.waiter.api('POST', '/api/staff/verify', { code: re.data.code })
  assert.equal(ok.status, 200)
  assert.equal((await S.waiter.api('POST', `/api/staff/orders/${o.id}/verify`, { code: re.data.code })).status, 200)
  S.verifiedOrder = o
})

test('cancellations: reason required; customer can cancel only before verification', async () => {
  const og = menuItem(S.menu, 'Pepsi')
  const mk = async () => {
    const r = await S.cust.api('POST', '/api/orders', { lines: [{ itemId: og.id, quantity: 1 }], idempotencyKey: idem() })
    return { track: r.data.trackToken, o: (await S.cust.api('GET', `/api/orders/${r.data.trackToken}`)).data.order }
  }
  const a = await mk()
  assert.equal((await S.cust.api('POST', `/api/orders/${a.track}/cancel`, { reason: 'Changed my mind' })).status, 200)
  assert.equal((await S.cust.api('GET', `/api/orders/${a.track}`)).data.order.status, 'cancelled')
  const b = await mk()
  assert.equal((await S.waiter.api('POST', `/api/staff/orders/${b.o.id}/transition`, { to: 'rejected' })).status, 400)
  assert.equal((await S.waiter.api('POST', `/api/staff/orders/${b.o.id}/transition`, { to: 'rejected', reason: 'Wrong table' })).status, 200)
  assert.equal((await S.waiter.api('POST', '/api/staff/verify', { code: b.o.verifyCode })).status, 404) // rejected orders cannot be verified
  // verified order cannot be cancelled by the customer
  const c = await mk()
  await S.waiter.api('POST', `/api/staff/orders/${c.o.id}/verify`, { code: c.o.verifyCode })
  assert.equal((await S.cust.api('POST', `/api/orders/${c.track}/cancel`, {})).status, 409)
})

test('brute force: too many wrong codes locks the waiter out temporarily', async () => {
  const w = client(); await login(w, { username: 'waiter2', password: 'Password#1234' })
  let last
  for (let i = 0; i < 12; i++) last = await w.api('POST', '/api/staff/verify', { code: String(100000 + i) })
  assert.equal(last.status, 429)
})

test('service requests: created once, visible to waiters, status updates', async () => {
  const a = await S.cust.api('POST', '/api/requests', { type: 'waiter' })
  const b = await S.cust.api('POST', '/api/requests', { type: 'waiter' })
  assert.equal(a.status, 201); assert.equal(b.status, 200); assert.equal(a.data.id, b.data.id) // no duplicate
  assert.equal((await S.cust.api('POST', '/api/requests', { type: 'free-money' })).status, 400)
  const bill = await S.cust.api('POST', '/api/requests', { type: 'bill' })
  assert.equal(bill.status, 201)
  const list = await S.waiter.api('GET', '/api/staff/requests')
  assert.ok(list.data.requests.some((r) => r.id === a.data.id && r.table === S.tables[0].number))
  for (const st of ['received', 'on_the_way', 'completed']) assert.equal((await S.waiter.api('PATCH', '/api/staff/requests', { id: a.data.id, status: st })).status, 200)
  const mine = await S.cust.api('GET', '/api/requests')
  assert.equal(mine.data.requests.some((r) => r.id === a.data.id), false)
  assert.equal((await client().api('POST', '/api/requests', { type: 'waiter' })).status, 403)
})

test('waiter-assisted session: one-time link opens a trusted session', async () => {
  const r = await S.waiter.api('POST', '/api/staff/tables', { tableId: S.tables[1].id })
  assert.equal(r.status, 200)
  const c = client()
  const first = await c.api('GET', new URL(r.data.url).pathname)
  assert.equal(first.status, 307)
  assert.equal((await c.api('GET', '/api/session')).data.table.number, S.tables[1].number)
  const again = await client().api('GET', new URL(r.data.url).pathname)
  assert.match(again.headers.get('location'), /table=invalid/)
})

test('manual table selection: allowed in open mode, always needs verification, can be disabled', async () => {
  await S.admin.api('PUT', '/api/admin/settings', { requireVerification: false })
  const c = client()
  const s0 = await c.api('GET', '/api/session')
  assert.ok(s0.data.tables.length >= 4)
  assert.equal((await c.api('POST', '/api/session', { publicId: 'nope' })).status, 404)
  const pick = await c.api('POST', '/api/session', { publicId: s0.data.tables[2].publicId })
  assert.equal(pick.status, 200)
  const og = menuItem(S.menu, 'Mineral Water')
  const r = await c.api('POST', '/api/orders', { lines: [{ itemId: og.id, quantity: 1 }], idempotencyKey: idem() })
  assert.equal((await c.api('GET', `/api/orders/${r.data.trackToken}`)).data.order.status, 'awaiting_verification') // untrusted session
  // QR session with verification switched off goes straight to the kitchen
  const q = client(); await scan(q, S.tables[3].qrUrl)
  const r2 = await q.api('POST', '/api/orders', { lines: [{ itemId: og.id, quantity: 1 }], idempotencyKey: idem() })
  const o2 = (await q.api('GET', `/api/orders/${r2.data.trackToken}`)).data.order
  assert.equal(o2.status, 'confirmed')
  assert.equal(o2.verificationStatus, 'not_required')
  await S.admin.api('PUT', '/api/admin/settings', { requireVerification: true, manualTableMode: 'waiter_only' })
  const c2 = client()
  assert.equal((await c2.api('GET', '/api/session')).data.tables.length, 0)
  assert.equal((await c2.api('POST', '/api/session', { publicId: s0.data.tables[2].publicId })).status, 403)
  await S.admin.api('PUT', '/api/admin/settings', { manualTableMode: 'open' })
})

test('admin: menu management, price snapshots, availability, categories', async () => {
  const cat = await S.admin.api('POST', '/api/admin/categories', { nameEn: 'Desserts', nameKu: '', nameAr: 'حلويات' })
  assert.equal(cat.status, 201)
  const item = await S.admin.api('POST', '/api/admin/items', {
    categoryId: cat.data.id, name: { en: 'Brownie', ku: '', ar: '' }, desc: { en: 'Warm brownie' }, price: 4000, prepMinutes: 7,
    allergens: ['gluten', 'egg'], ingredients: ['chocolate'],
    groups: [{ name: { en: 'Topping' }, kind: 'single', required: true, options: [{ name: { en: 'Vanilla ice cream' }, priceDelta: 1000, isDefault: true }, { name: { en: 'None' }, priceDelta: 0 }] }],
  })
  assert.equal(item.status, 201, JSON.stringify(item.data))
  const menu = (await client().api('GET', '/api/menu')).data
  const brownie = menuItem(menu, 'Brownie')
  assert.equal(brownie.groups[0].options.length, 2)
  assert.deepEqual(brownie.allergens, ['gluten', 'egg'])
  // required group falls back to its default when omitted
  const q = await S.cust.api('POST', '/api/orders/quote', { lines: [{ itemId: brownie.id, quantity: 1 }] })
  assert.equal(q.data.total, 5000)
  assert.equal(q.data.estMinutes, 7)
  const ord = await S.cust.api('POST', '/api/orders', { lines: [{ itemId: brownie.id, quantity: 1 }], idempotencyKey: idem() })
  const before = (await S.cust.api('GET', `/api/orders/${ord.data.trackToken}`)).data.order
  // price change must not rewrite history
  assert.equal((await S.admin.api('PATCH', `/api/admin/items/${brownie.id}`, { price: 9999 })).status, 200)
  const after = (await S.cust.api('GET', `/api/orders/${ord.data.trackToken}`)).data.order
  assert.equal(after.total, before.total)
  assert.equal((await S.cust.api('POST', '/api/orders/quote', { lines: [{ itemId: brownie.id, quantity: 1 }] })).data.total, 10999)
  // unavailable items cannot be ordered
  await S.admin.api('PATCH', `/api/admin/items/${brownie.id}`, { available: false })
  assert.equal((await S.cust.api('POST', '/api/orders', { lines: [{ itemId: brownie.id, quantity: 1 }], idempotencyKey: idem() })).status, 409)
  // category with items cannot be deleted
  assert.equal((await S.admin.api('DELETE', `/api/admin/categories?id=${cat.data.id}`)).status, 409)
  // hide category => disappears from public menu
  await S.admin.api('PATCH', '/api/admin/categories', { id: cat.data.id, visible: false })
  assert.equal((await client().api('GET', '/api/menu')).data.categories.some((c) => c.name.en === 'Desserts'), false)
  // reorder
  const all = (await S.admin.api('GET', '/api/admin/categories')).data.categories
  const ids = all.map((c) => c.id).reverse()
  await S.admin.api('PATCH', '/api/admin/categories', { id: ids[0], order: ids })
  assert.equal((await S.admin.api('GET', '/api/admin/categories')).data.categories[0].id, ids[0])
  assert.equal((await S.admin.api('DELETE', `/api/admin/items/${brownie.id}`)).status, 200)
  assert.equal((await S.admin.api('DELETE', `/api/admin/categories?id=${cat.data.id}`)).status, 200)
})

test('admin: tables, QR regeneration, staff protections, settings validation', async () => {
  const t = S.tables[3]
  assert.equal((await S.admin.api('PATCH', '/api/admin/tables', { id: t.id, active: false })).status, 200)
  assert.match((await client().api('GET', new URL(t.qrUrl).pathname)).headers.get('location'), /table=invalid/) // disabled table
  await S.admin.api('PATCH', '/api/admin/tables', { id: t.id, active: true })
  const old = S.tables[2].qrUrl
  await S.admin.api('PATCH', '/api/admin/tables', { id: S.tables[2].id, regenerateQr: true })
  assert.match((await client().api('GET', new URL(old).pathname)).headers.get('location'), /table=invalid/)
  assert.equal((await S.admin.api('POST', '/api/admin/tables', { number: '1' })).status, 409)
  assert.equal((await S.admin.api('DELETE', `/api/admin/tables?id=${S.tables[0].id}`)).status, 409) // has history
  const wid = (await S.admin.api('GET', '/api/admin/staff')).data.staff.find((s) => s.username === 'waiter1').id
  assert.equal((await S.admin.api('PATCH', '/api/admin/tables', { id: S.tables[1].id, waiterId: wid })).status, 200)
  const adminId = (await S.admin.api('GET', '/api/admin/staff')).data.staff.find((s) => s.username === 'admin').id
  assert.equal((await S.admin.api('PATCH', '/api/admin/staff', { id: adminId, active: false })).status, 409) // last admin
  assert.equal((await S.admin.api('PATCH', '/api/admin/staff', { id: adminId, role: 'waiter' })).status, 409)
  // deactivated staff lose access immediately
  const w2 = (await S.admin.api('GET', '/api/admin/staff')).data.staff.find((s) => s.username === 'waiter2').id
  await S.admin.api('PATCH', '/api/admin/staff', { id: w2, active: false })
  assert.equal((await S.waiter2.api('GET', '/api/staff/orders')).status, 401)
  assert.equal((await client().api('POST', '/api/staff/login', { username: 'waiter2', password: 'Password#1234' })).status, 401)
  assert.equal((await S.admin.api('POST', '/api/admin/staff', { username: 'weak', name: 'x', role: 'waiter', password: '123' })).status, 400)
  assert.equal((await S.admin.api('PUT', '/api/admin/settings', { taxPercent: 999 })).status, 400)
  assert.equal((await S.admin.api('PUT', '/api/admin/settings', { hacked: true })).status, 400)
  assert.equal((await S.admin.api('PUT', '/api/admin/settings', { restaurantName: 'Smashed Burger Erbil' })).status, 200)
  const row = sql().prepare("SELECT password_hash FROM staff WHERE username = 'admin'").get()
  assert.match(row.password_hash, /^scrypt\$/)
})

test('tax and service charge are applied server-side', async () => {
  await S.admin.api('PUT', '/api/admin/settings', { taxPercent: 10, servicePercent: 5 })
  const og = menuItem(S.menu, 'Pepsi')
  const q = await S.cust.api('POST', '/api/orders/quote', { lines: [{ itemId: og.id, quantity: 2 }] })
  assert.deepEqual([q.data.subtotal, q.data.tax, q.data.service, q.data.total], [3000, 300, 150, 3450])
  await S.admin.api('PUT', '/api/admin/settings', { taxPercent: 0, servicePercent: 0 })
})

test('admin: statistics come from real orders; orders list/filter; export', async () => {
  const st = await S.admin.api('GET', '/api/admin/stats')
  const real = sql().prepare('SELECT COUNT(*) c FROM orders').get().c
  assert.equal(st.data.totalOrders, real)
  assert.equal(st.data.totalSales, 20000) // only the one completed order is counted as sales
  assert.equal(st.data.popular[0].name, 'OG Smash')
  const list = await S.manager.api('GET', '/api/staff/orders?status=completed')
  assert.equal(list.data.total, 1)
  const byTable = await S.manager.api('GET', `/api/staff/orders?table=${S.tables[0].number}`)
  assert.ok(byTable.data.orders.every((o) => o.tableNumber === S.tables[0].number))
  const csv = await S.manager.api('GET', '/api/admin/export')
  assert.equal(csv.status, 200)
  assert.match(csv.data, /^number,created_at_utc/)
  assert.equal((await S.waiter.api('GET', '/api/admin/export')).status, 403)
  const w = await S.waiter.api('GET', '/api/staff/orders?status=completed&q=x') // waiters cannot browse history
  assert.ok(w.data.orders.every((o) => o.status !== 'completed'))
})

test('uploads: real images accepted, disguised files rejected', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  const f = new FormData(); f.set('file', new Blob([png], { type: 'image/png' }), 'dish.png')
  const ok = await S.admin.api('POST', '/api/admin/upload', undefined, { form: f })
  assert.equal(ok.status, 201, JSON.stringify(ok.data))
  const img = await client().api('GET', ok.data.url, undefined, { raw: true })
  assert.equal(img.status, 200)
  assert.equal(img.headers.get('content-type'), 'image/png')
  const bad = new FormData(); bad.set('file', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'x.png')
  assert.equal((await S.admin.api('POST', '/api/admin/upload', undefined, { form: bad })).status, 415)
  assert.equal((await client().api('GET', '/uploads/..%2F..%2Fetc%2Fpasswd')).status, 404)
  const anon = new FormData(); anon.set('file', new Blob([png]), 'a.png')
  assert.equal((await client().api('POST', '/api/admin/upload', undefined, { form: anon })).status, 401)
})

test('security: CSRF origin check, login throttling, no secrets leaked', async () => {
  const r = await S.admin.api('PUT', '/api/admin/settings', { tagline: 'x' }, { headers: { origin: 'https://evil.example' } })
  assert.equal(r.status, 403)
  const a = client()
  const bad = await a.api('POST', '/api/staff/login', { username: 'admin', password: 'wrong' })
  assert.equal(bad.status, 401)
  assert.equal(JSON.stringify(bad.data).includes('scrypt'), false)
  let st
  for (let i = 0; i < 10; i++) st = await a.api('POST', '/api/staff/login', { username: 'thr0ttle', password: 'x' })
  assert.equal(st.status, 429)
  const menu = JSON.stringify((await client().api('GET', '/api/menu')).data)
  assert.equal(/qr_token|password|track_token/.test(menu), false)
  const sess = (await S.cust.api('GET', '/api/session')).data
  assert.equal(/\/t\/|qr_token/.test(JSON.stringify(sess)), false)
})

test('realtime: staff event stream requires login and announces events', async () => {
  assert.equal((await client().api('GET', '/api/staff/events', undefined, { raw: true })).status, 401)
  const res = await S.waiter.api('GET', '/api/staff/events', undefined, { raw: true })
  assert.equal(res.headers.get('content-type').startsWith('text/event-stream'), true)
  await res.body.cancel()
})
