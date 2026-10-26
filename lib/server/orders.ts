import 'server-only'
import { all, get, run, tx } from './db'
import { ApiError } from './http'
import { audit, type Role, type Staff, type TableSession } from './auth'
import { publish } from './events'
import { getSettings } from './settings'
import { randomCode, randomToken, safeEqual, sha256 } from './security'

// ---------------------------------------------------------------- statuses

export const STATUSES = [
  'awaiting_verification', 'verified', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'rejected', 'cancelled',
] as const
export type OrderStatus = (typeof STATUSES)[number]
export const FINAL: OrderStatus[] = ['completed', 'rejected', 'cancelled']

const WAITERS: Role[] = ['waiter', 'manager', 'admin']
const KITCHEN: Role[] = ['kitchen', 'manager', 'admin']
const MANAGERS: Role[] = ['manager', 'admin']

/** Controlled workflow: which roles may move an order from one status to the next. */
const TRANSITIONS: Record<OrderStatus, Partial<Record<OrderStatus, Role[]>>> = {
  awaiting_verification: { verified: WAITERS, rejected: WAITERS, cancelled: WAITERS },
  verified: { confirmed: WAITERS, rejected: WAITERS, cancelled: WAITERS },
  confirmed: { preparing: KITCHEN, cancelled: WAITERS },
  preparing: { ready: KITCHEN, cancelled: MANAGERS },
  ready: { served: WAITERS, cancelled: MANAGERS },
  served: { completed: WAITERS },
  completed: {},
  rejected: {},
  cancelled: {},
}

const iso = (s: string | null) => (s ? s.replace(' ', 'T') + 'Z' : null)

// ---------------------------------------------------------------- pricing

export type CartLine = { itemId: number; quantity: number; optionIds?: number[]; instructions?: string }

type ItemRow = {
  id: number; name_en: string; price: number; offer_price: number | null; available: number; visible: number
  cat_visible: number; prep_minutes: number | null
}
type GroupRow = { id: number; item_id: number; name_en: string; kind: 'single' | 'multi'; required: number; min_select: number; max_select: number }
type OptRow = { id: number; group_id: number; name_en: string; price_delta: number; is_default: number; available: number }

export type PricedLine = {
  itemId: number; name: string; unitPrice: number; optionsTotal: number; quantity: number; lineTotal: number
  instructions: string; options: Array<{ group: string; name: string; delta: number }>; prep: number | null
}

/** The only place prices are computed. The browser's numbers are never used. */
export function priceCart(lines: CartLine[]) {
  if (!Array.isArray(lines) || lines.length === 0) throw new ApiError(400, 'Your cart is empty', 'empty_cart')
  if (lines.length > 30) throw new ApiError(400, 'Too many different items in one order', 'too_many')

  const ids = [...new Set(lines.map((l) => Number(l.itemId)))]
  if (ids.some((n) => !Number.isInteger(n))) throw new ApiError(400, 'Invalid item', 'invalid_item')
  const marks = ids.map(() => '?').join(',')
  const items = all<ItemRow>(
    `SELECT i.id, i.name_en, i.price, i.offer_price, i.available, i.visible, c.visible AS cat_visible, i.prep_minutes
     FROM items i JOIN categories c ON c.id = i.category_id WHERE i.id IN (${marks})`, ...ids,
  )
  const groups = all<GroupRow>(`SELECT * FROM option_groups WHERE item_id IN (${marks})`, ...ids)
  const opts = groups.length
    ? all<OptRow>(`SELECT * FROM options WHERE group_id IN (${groups.map(() => '?').join(',')})`, ...groups.map((g) => g.id))
    : []

  const priced: PricedLine[] = lines.map((l) => {
    const qty = Number(l.quantity)
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) throw new ApiError(400, 'Invalid quantity', 'invalid_quantity')
    const item = items.find((i) => i.id === Number(l.itemId))
    if (!item || !item.visible || !item.cat_visible) throw new ApiError(400, 'An item in your cart no longer exists', 'invalid_item')
    if (!item.available) throw new ApiError(409, `${item.name_en} is currently unavailable`, 'unavailable')

    const chosen = new Set((l.optionIds ?? []).map(Number))
    if (chosen.size !== (l.optionIds ?? []).length) throw new ApiError(400, 'Duplicate options', 'invalid_option')
    const itemGroups = groups.filter((g) => g.item_id === item.id)
    const selected: Array<{ group: string; name: string; delta: number }> = []

    for (const g of itemGroups) {
      const gOpts = opts.filter((o) => o.group_id === g.id)
      let picks = gOpts.filter((o) => chosen.has(o.id))
      if (picks.some((o) => !o.available)) throw new ApiError(409, `An option for ${item.name_en} is unavailable`, 'unavailable')
      if (g.kind === 'single' && picks.length > 1) throw new ApiError(400, `Choose only one ${g.name_en}`, 'invalid_option')
      if (g.required && picks.length === 0) {
        const def = gOpts.find((o) => o.is_default && o.available)
        if (!def) throw new ApiError(400, `Please choose: ${g.name_en}`, 'missing_option')
        picks = [def]
      }
      if (picks.length > g.max_select) throw new ApiError(400, `Too many choices for ${g.name_en}`, 'invalid_option')
      if (picks.length < g.min_select) throw new ApiError(400, `Please choose: ${g.name_en}`, 'missing_option')
      for (const p of picks) {
        chosen.delete(p.id)
        selected.push({ group: g.name_en, name: p.name_en, delta: p.price_delta })
      }
    }
    if (chosen.size) throw new ApiError(400, 'Invalid option for this item', 'invalid_option') // option from another item

    const unit = item.offer_price ?? item.price
    const optionsTotal = selected.reduce((s, o) => s + o.delta, 0)
    const instructions = String(l.instructions ?? '').trim().slice(0, 200)
    return {
      itemId: item.id, name: item.name_en, unitPrice: unit, optionsTotal, quantity: qty,
      lineTotal: (unit + optionsTotal) * qty, instructions, options: selected, prep: item.prep_minutes,
    }
  })

  const s = getSettings()
  const subtotal = priced.reduce((a, l) => a + l.lineTotal, 0)
  const tax = Math.round((subtotal * s.taxPercent) / 100)
  const service = Math.round((subtotal * s.servicePercent) / 100)
  const preps = priced.map((l) => l.prep)
  const est = preps.every((p) => p !== null) ? Math.max(...(preps as number[])) : null
  return { lines: priced, subtotal, tax, service, total: subtotal + tax + service, estMinutes: est }
}

// ---------------------------------------------------------------- notifications

export function notify(audience: 'waiter' | 'kitchen' | 'admin', kind: string, title: string, body = '', orderId: number | null = null) {
  run('INSERT INTO notifications (audience, kind, title, body, order_id) VALUES (?, ?, ?, ?, ?)', audience, kind, title, body, orderId)
  publish(audience === 'kitchen' ? 'kitchen' : 'staff', 'notification', { audience, kind, title })
}

const orderNo = (n: number) => `ORD-${n}`

// ---------------------------------------------------------------- create

export function createOrder(session: TableSession, input: { lines: CartLine[]; note?: string; idempotencyKey: string }) {
  const s = getSettings()
  if (!s.orderingEnabled) throw new ApiError(403, 'Ordering is temporarily unavailable', 'ordering_disabled')
  const key = String(input.idempotencyKey ?? '')
  if (key.length < 8 || key.length > 80) throw new ApiError(400, 'Missing idempotency key', 'invalid')

  const created = tx(() => {
    const existing = get<{ public_id: string }>('SELECT public_id FROM orders WHERE session_id = ? AND idempotency_key = ?', session.id, key)
    if (existing) return { duplicate: true as const }

    const open = get<{ c: number }>(
      `SELECT COUNT(*) c FROM orders WHERE session_id = ? AND status NOT IN ('completed','rejected','cancelled')`, session.id,
    )!.c
    if (open >= 5) throw new ApiError(429, 'You already have several open orders. Please ask your waiter.', 'too_many_orders')

    const priced = priceCart(input.lines)
    const next = (get<{ n: number | null }>('SELECT MAX(number) n FROM orders')!.n ?? 1000) + 1
    const needsVerification = s.requireVerification || !session.trusted
    const status: OrderStatus = needsVerification ? 'awaiting_verification' : 'confirmed'

    let code = ''
    for (let i = 0; i < 25; i++) {
      code = randomCode()
      if (!get('SELECT 1 FROM orders WHERE verify_code = ? AND verification_status = \'pending\'', code)) break
      if (i === 24) throw new ApiError(503, 'Please try again', 'busy')
    }
    const publicId = randomToken(9)
    const trackToken = randomToken(24)
    const verifyToken = randomToken(24)

    const r = run(
      `INSERT INTO orders (public_id, number, table_id, table_number, session_id, idempotency_key, track_token_hash, status,
         verification_status, verify_code, verify_token_hash, verify_token, verify_expires_at, subtotal, tax, service_charge, total,
         customer_note, est_ready_minutes, confirmed_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,datetime('now', ?),?,?,?,?,?,?,?)`,
      publicId, next, session.table_id, session.table_number, session.id, key, sha256(trackToken), status,
      needsVerification ? 'pending' : 'not_required', needsVerification ? code : null, sha256(verifyToken), needsVerification ? verifyToken : null,
      `+${s.verifyTtlMinutes} minutes`, priced.subtotal, priced.tax, priced.service, priced.total,
      String(input.note ?? '').trim().slice(0, 300), priced.estMinutes, needsVerification ? null : new Date().toISOString().slice(0, 19).replace('T', ' '),
    )
    const orderId = Number(r.lastInsertRowid)
    for (const l of priced.lines) {
      const li = run(
        'INSERT INTO order_items (order_id, item_id, name, unit_price, options_total, quantity, line_total, instructions) VALUES (?,?,?,?,?,?,?,?)',
        orderId, l.itemId, l.name, l.unitPrice, l.optionsTotal, l.quantity, l.lineTotal, l.instructions,
      )
      for (const o of l.options)
        run('INSERT INTO order_item_options (order_item_id, group_name, option_name, price_delta) VALUES (?,?,?,?)',
          Number(li.lastInsertRowid), o.group, o.name, o.delta)
    }
    run('INSERT INTO order_status_history (order_id, from_status, to_status, actor, note) VALUES (?,?,?,?,?)',
      orderId, null, status, `customer@table ${session.table_number}`, needsVerification ? '' : 'Verification not required')
    run('UPDATE tables SET occupied = 1 WHERE id = ?', session.table_id)

    notify('waiter', needsVerification ? 'verify_needed' : 'new_order',
      `${needsVerification ? 'Verify' : 'New'} order ${orderNo(next)}`, `Table ${session.table_number}`, orderId)
    if (!needsVerification) notify('kitchen', 'confirmed', `Order ${orderNo(next)} confirmed`, `Table ${session.table_number}`, orderId)
    return { duplicate: false as const, orderId, trackToken, publicId }
  })

  if (created.duplicate) {
    // Same idempotency key: hand back the original order without creating a second one.
    const o = get<{ id: number }>('SELECT id FROM orders WHERE session_id = ? AND idempotency_key = ?', session.id, key)!
    return { duplicate: true, order: null as null, trackToken: null as null, id: o.id }
  }
  publish('staff', 'order', { id: created.publicId })
  return { duplicate: false, trackToken: created.trackToken, id: created.orderId }
}

// ---------------------------------------------------------------- read models

type OrderRow = {
  id: number; public_id: string; number: number; table_id: number; table_number: string; status: OrderStatus
  verification_status: string; verify_code: string | null; verify_token_hash: string | null; verify_expires_at: string | null
  verify_token: string | null; verified_by: number | null; verified_at: string | null; subtotal: number; tax: number; service_charge: number; total: number
  customer_note: string; internal_note: string; cancel_reason: string; est_ready_minutes: number | null
  created_at: string; updated_at: string; confirmed_at: string | null
}

function items(orderId: number) {
  const rows = all<{ id: number; name: string; unit_price: number; options_total: number; quantity: number; line_total: number; instructions: string }>(
    'SELECT id, name, unit_price, options_total, quantity, line_total, instructions FROM order_items WHERE order_id = ? ORDER BY id', orderId)
  const opts = all<{ order_item_id: number; group_name: string; option_name: string; price_delta: number }>(
    `SELECT oio.* FROM order_item_options oio JOIN order_items oi ON oi.id = oio.order_item_id WHERE oi.order_id = ? ORDER BY oio.id`, orderId)
  return rows.map((r) => ({
    name: r.name, unitPrice: r.unit_price, optionsTotal: r.options_total, quantity: r.quantity, lineTotal: r.line_total,
    instructions: r.instructions,
    options: opts.filter((o) => o.order_item_id === r.id).map((o) => ({ group: o.group_name, name: o.option_name, delta: o.price_delta })),
  }))
}

function history(orderId: number) {
  return all<{ from_status: string | null; to_status: string; actor: string; note: string; created_at: string; staff_name: string | null }>(
    `SELECT h.from_status, h.to_status, h.actor, h.note, h.created_at, s.name AS staff_name
     FROM order_status_history h LEFT JOIN staff s ON s.id = h.staff_id WHERE h.order_id = ? ORDER BY h.id`, orderId,
  ).map((h) => ({ from: h.from_status, to: h.to_status, by: h.staff_name ?? h.actor, note: h.note, at: iso(h.created_at) }))
}

function base(o: OrderRow) {
  return {
    id: o.public_id, number: o.number, label: orderNo(o.number), tableNumber: o.table_number, status: o.status,
    verificationStatus: o.verification_status, subtotal: o.subtotal, tax: o.tax, serviceCharge: o.service_charge, total: o.total,
    customerNote: o.customer_note, cancelReason: o.cancel_reason, estReadyMinutes: o.est_ready_minutes,
    createdAt: iso(o.created_at), updatedAt: iso(o.updated_at), confirmedAt: iso(o.confirmed_at),
  }
}

/** Customer's view. Authenticated only by possession of the secret tracking token. */
export function orderByTrackToken(token: string) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 80) return null
  const o = get<OrderRow>('SELECT * FROM orders WHERE track_token_hash = ?', sha256(token))
  if (!o) return null
  const expired = !!o.verify_expires_at && o.verify_expires_at < new Date().toISOString().slice(0, 19).replace('T', ' ')
  return {
    ...base(o),
    items: items(o.id),
    timeline: history(o.id),
    // Credentials are only exposed while they can still be used.
    verifyCode: o.status === 'awaiting_verification' && !expired ? o.verify_code : null,
    verifyToken: o.status === 'awaiting_verification' && !expired ? o.verify_token : null,
    verifyExpiresAt: o.status === 'awaiting_verification' ? iso(o.verify_expires_at) : null,
    verifyExpired: o.status === 'awaiting_verification' && expired,
    _orderId: o.id,
  }
}

/** Fresh QR token for the verification screen (token itself is only ever issued here / at reissue). */
export function reissueVerification(orderId: number, ttlMinutes: number) {
  return tx(() => {
    const o = get<OrderRow>('SELECT * FROM orders WHERE id = ?', orderId)
    if (!o || o.status !== 'awaiting_verification') throw new ApiError(409, 'This order no longer needs verification', 'not_pending')
    let code = ''
    for (let i = 0; i < 25; i++) {
      code = randomCode()
      if (!get(`SELECT 1 FROM orders WHERE verify_code = ? AND verification_status = 'pending'`, code)) break
    }
    const token = randomToken(24)
    run(`UPDATE orders SET verify_code = ?, verify_token_hash = ?, verify_token = ?, verify_expires_at = datetime('now', ?), updated_at = datetime('now') WHERE id = ?`,
      code, sha256(token), token, `+${ttlMinutes} minutes`, orderId)
    return { code, token }
  })
}

export function staffOrder(id: string) {
  const o = get<OrderRow>('SELECT * FROM orders WHERE public_id = ?', id)
  if (!o) return null
  return {
    ...base(o), items: items(o.id), timeline: history(o.id), internalNote: o.internal_note,
    verifiedAt: iso(o.verified_at),
    verifiedBy: o.verified_by ? get<{ name: string }>('SELECT name FROM staff WHERE id = ?', o.verified_by)?.name ?? null : null,
    allowed: allowedNext(o.status),
  }
}

export function allowedNext(status: OrderStatus) {
  return Object.entries(TRANSITIONS[status]).map(([to, roles]) => ({ to: to as OrderStatus, roles }))
}

export type ListFilter = {
  statuses?: string[]; tableId?: number; q?: string; from?: string; to?: string; limit?: number; offset?: number
}
export function listOrders(f: ListFilter) {
  const where: string[] = []
  const args: unknown[] = []
  if (f.statuses?.length) {
    const valid = f.statuses.filter((s) => (STATUSES as readonly string[]).includes(s))
    if (valid.length) { where.push(`status IN (${valid.map(() => '?').join(',')})`); args.push(...valid) }
  }
  if (f.tableId) { where.push('table_id = ?'); args.push(f.tableId) }
  if (f.q) {
    const num = f.q.replace(/\D/g, '')
    where.push('(CAST(number AS TEXT) LIKE ? OR table_number LIKE ?)')
    args.push(`%${num || f.q}%`, `%${f.q}%`)
  }
  if (f.from) { where.push('created_at >= ?'); args.push(f.from) }
  if (f.to) { where.push('created_at < ?'); args.push(f.to) }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const limit = Math.min(Math.max(f.limit ?? 50, 1), 200)
  const rows = all<OrderRow & { item_count: number }>(
    `SELECT o.*, (SELECT COALESCE(SUM(quantity),0) FROM order_items WHERE order_id = o.id) AS item_count
     FROM orders o ${clause} ORDER BY o.id DESC LIMIT ? OFFSET ?`, ...args, limit, f.offset ?? 0)
  const total = get<{ c: number }>(`SELECT COUNT(*) c FROM orders ${clause}`, ...args)!.c
  return { total, orders: rows.map((o) => ({ ...base(o), itemCount: o.item_count })) }
}

/** Kitchen display: confirmed/preparing/ready with full line detail. */
export function kitchenOrders() {
  const rows = all<OrderRow>(`SELECT * FROM orders WHERE status IN ('confirmed','preparing','ready') ORDER BY COALESCE(confirmed_at, created_at), id`)
  return rows.map((o) => ({ ...base(o), items: items(o.id) }))
}

// ---------------------------------------------------------------- transitions

export type Actor = { staff: Staff | null; label: string }

export function transition(
  publicId: string, to: OrderStatus, actor: Actor, opts: { reason?: string; note?: string } = {},
) {
  const result = tx(() => {
    const o = get<OrderRow>('SELECT * FROM orders WHERE public_id = ?', publicId)
    if (!o) throw new ApiError(404, 'Order not found', 'not_found')
    const s = getSettings()

    // waiter shortcut straight to "served" only if the restaurant enabled that workflow
    let allowedRoles = TRANSITIONS[o.status][to]
    if (!allowedRoles && s.waiterCanSkipKitchen && to === 'served' && (o.status === 'confirmed' || o.status === 'verified')) allowedRoles = WAITERS
    if (!allowedRoles) throw new ApiError(409, `An order that is "${o.status.replace('_', ' ')}" cannot become "${to}"`, 'bad_transition')
    if (actor.staff ? !allowedRoles.includes(actor.staff.role) : !(to === 'cancelled' && o.status === 'awaiting_verification'))
      throw new ApiError(403, 'You do not have permission for this change', 'forbidden')
    if ((to === 'rejected' || to === 'cancelled') && !(opts.reason ?? '').trim())
      throw new ApiError(400, 'Please give a reason', 'reason_required')
    if (to === 'confirmed' && s.kitchenNeedsVerified && o.verification_status === 'pending')
      throw new ApiError(409, 'This order has not been verified yet', 'not_verified')

    const sets = ["status = ?", "updated_at = datetime('now')", 'verify_token = NULL']
    const args: unknown[] = [to]
    if (to === 'verified') {
      sets.push("verification_status = 'verified'", "verified_at = datetime('now')", 'verified_by = ?', 'verify_code = NULL')
      args.push(actor.staff?.id ?? null)
    }
    if (to === 'rejected') sets.push("verification_status = 'rejected'", 'verify_code = NULL')
    if (to === 'confirmed') sets.push("confirmed_at = datetime('now')")
    if (to === 'rejected' || to === 'cancelled') { sets.push('cancel_reason = ?'); args.push((opts.reason ?? '').trim().slice(0, 300)); sets.push('verify_code = NULL') }
    run(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`, ...args, o.id)
    run('INSERT INTO order_status_history (order_id, from_status, to_status, staff_id, actor, note) VALUES (?,?,?,?,?,?)',
      o.id, o.status, to, actor.staff?.id ?? null, actor.label, (opts.reason ?? opts.note ?? '').slice(0, 300))
    if (FINAL.includes(to)) closeTableIfIdle(o.table_id, o.id)

    const label = orderNo(o.number)
    if (to === 'confirmed') notify('kitchen', 'confirmed', `New order ${label}`, `Table ${o.table_number}`, o.id)
    if (to === 'ready') notify('waiter', 'ready', `${label} is ready to serve`, `Table ${o.table_number}`, o.id)
    if (to === 'cancelled' || to === 'rejected') {
      notify('waiter', 'cancelled', `${label} ${to}`, opts.reason ?? '', o.id)
      if (['confirmed', 'preparing', 'ready'].includes(o.status)) notify('kitchen', 'cancelled', `${label} ${to}`, `Table ${o.table_number}`, o.id)
    }
    return { label, from: o.status }
  })
  audit(actor.staff, actor.label, `order.${to}`, publicId, opts.reason ?? opts.note ?? '')
  publish('staff', 'order', { id: publicId, status: to })
  publish('kitchen', 'order', { id: publicId, status: to })
  publish(`order:${publicId}`, 'status', { status: to })
  return result
}

function closeTableIfIdle(tableId: number, exceptOrderId: number) {
  const open = get<{ c: number }>(
    `SELECT COUNT(*) c FROM orders WHERE table_id = ? AND id != ? AND status NOT IN ('completed','rejected','cancelled')`, tableId, exceptOrderId)!.c
  if (!open) run('UPDATE tables SET occupied = 0 WHERE id = ?', tableId)
}

// ---------------------------------------------------------------- verification

export type Credential = { code?: string; token?: string }

/** Finds the order a credential points at WITHOUT changing anything (used for previews). */
export function lookupForVerification(cred: Credential) {
  const code = typeof cred.code === 'string' ? cred.code.replace(/\D/g, '') : ''
  const token = typeof cred.token === 'string' ? cred.token : ''
  let o: OrderRow | undefined
  if (token && token.length >= 20 && token.length <= 80) o = get<OrderRow>('SELECT * FROM orders WHERE verify_token_hash = ?', sha256(token))
  else if (/^\d{6}$/.test(code)) o = get<OrderRow>(`SELECT * FROM orders WHERE verify_code = ? AND verification_status = 'pending'`, code)
  else throw new ApiError(400, 'Enter the 6-digit code or scan the order QR', 'invalid_credential')
  if (!o) throw new ApiError(404, 'Invalid or already used code', 'invalid_code')
  // Re-check the secret in constant time when a code was used with a loaded row
  if (!token && o.verify_code && !safeEqual(o.verify_code, code)) throw new ApiError(404, 'Invalid or already used code', 'invalid_code')

  if (o.status === 'cancelled' || o.status === 'rejected')
    throw new ApiError(409, `This order was ${o.status}`, 'order_cancelled')
  if (o.status !== 'awaiting_verification' || o.verification_status !== 'pending') {
    const who = o.verified_by ? get<{ name: string }>('SELECT name FROM staff WHERE id = ?', o.verified_by)?.name : null
    throw new ApiError(409, `Already verified${who ? ` by ${who}` : ''}${o.verified_at ? ` at ${iso(o.verified_at)}` : ''}`, 'already_verified')
  }
  if (o.verify_expires_at && o.verify_expires_at < new Date().toISOString().slice(0, 19).replace('T', ' '))
    throw new ApiError(410, 'This code has expired. Ask the customer to refresh their order page.', 'expired')
  return o
}

export function previewVerification(staff: Staff, cred: Credential) {
  if (!limitVerify(staff)) throw new ApiError(429, 'Too many failed attempts. Wait a few minutes.', 'rate_limited')
  try {
    const o = lookupForVerification(cred)
    return { ...base(o), items: items(o.id) }
  } catch (e) {
    recordFailure(staff)
    throw e
  }
}

export function verifyOrder(staff: Staff, publicId: string, cred: Credential) {
  if (!limitVerify(staff)) throw new ApiError(429, 'Too many failed attempts. Wait a few minutes.', 'rate_limited')
  let o: OrderRow
  try {
    o = lookupForVerification(cred)
  } catch (e) {
    recordFailure(staff)
    throw e
  }
  // The credential must belong to the order the waiter is looking at (prevents confirming the wrong order).
  if (o.public_id !== publicId) { recordFailure(staff); throw new ApiError(409, 'That code belongs to a different order', 'wrong_order') }
  transition(publicId, 'verified', { staff, label: `${staff.name} (${staff.role})` })
  return staffOrder(publicId)!
}

function limitVerify(staff: Staff) {
  return failuresIn(staff) < 10 // 10 failed lookups per 5 minutes per staff account
}
const failLog = new Map<number, number[]>()
function failuresIn(staff: Staff) {
  const now = Date.now()
  const list = (failLog.get(staff.id) ?? []).filter((t) => now - t < 5 * 60_000)
  failLog.set(staff.id, list)
  return list.length
}
function recordFailure(staff: Staff) {
  failuresIn(staff)
  failLog.get(staff.id)!.push(Date.now())
}
export function resetVerifyFailures() { failLog.clear() }

// ---------------------------------------------------------------- service requests

export const REQUEST_STATUSES = ['waiting', 'received', 'on_the_way', 'completed'] as const

export function createServiceRequest(session: TableSession, type: string) {
  const s = getSettings()
  if (!s.requestTypes.includes(type)) throw new ApiError(400, 'Unknown request type', 'invalid')
  const out = tx(() => {
    const open = get<{ id: number }>(
      `SELECT id FROM service_requests WHERE table_id = ? AND type = ? AND status != 'completed'`, session.table_id, type)
    if (open) return { id: open.id, duplicate: true }
    const r = run(`INSERT INTO service_requests (table_id, session_id, type, status) VALUES (?,?,?, 'waiting')`, session.table_id, session.id, type)
    notify('waiter', 'request', type === 'bill' ? `Table ${session.table_number} wants the bill` : `Table ${session.table_number} needs: ${type}`, '')
    return { id: Number(r.lastInsertRowid), duplicate: false }
  })
  publish('staff', 'request', {})
  return out
}

export function listRequests(opts: { tableId?: number; onlyOpen?: boolean } = {}) {
  const where = ['1=1']
  const args: unknown[] = []
  if (opts.onlyOpen) where.push(`r.status != 'completed'`)
  if (opts.tableId) { where.push('r.table_id = ?'); args.push(opts.tableId) }
  return all<{ id: number; type: string; status: string; created_at: string; updated_at: string; number: string; handler: string | null }>(
    `SELECT r.id, r.type, r.status, r.created_at, r.updated_at, t.number, s.name AS handler
     FROM service_requests r JOIN tables t ON t.id = r.table_id LEFT JOIN staff s ON s.id = r.handled_by
     WHERE ${where.join(' AND ')} ORDER BY r.id DESC LIMIT 100`, ...args,
  ).map((r) => ({ id: r.id, type: r.type, status: r.status, table: r.number, handler: r.handler, createdAt: iso(r.created_at), updatedAt: iso(r.updated_at) }))
}

export function updateRequest(staff: Staff, id: number, status: string) {
  if (!(REQUEST_STATUSES as readonly string[]).includes(status)) throw new ApiError(400, 'Invalid status', 'invalid')
  const r = get<{ id: number }>('SELECT id FROM service_requests WHERE id = ?', id)
  if (!r) throw new ApiError(404, 'Request not found', 'not_found')
  run(`UPDATE service_requests SET status = ?, handled_by = ?, updated_at = datetime('now') WHERE id = ?`, status, staff.id, id)
  audit(staff, staff.name, 'request.update', String(id), status)
  publish('staff', 'request', {})
}

export { iso, orderNo }
