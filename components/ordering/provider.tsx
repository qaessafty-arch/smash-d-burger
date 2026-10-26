'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Category, CartLine, MenuItem, PublicSettings, Quote, TableInfo } from './types'
import type { Lang } from './i18n'
import { BASE_PATH, STATIC_SITE } from '@/lib/utils'

/** Static (GitHub Pages) build: client-side open/closed check from the saved opening hours. */
function openNow(hours: PublicSettings['hours'], tz: string) {
  try {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date())
    const wd = p.find((x) => x.type === 'weekday')!.value.toLowerCase().slice(0, 3)
    const cur = (Number(p.find((x) => x.type === 'hour')!.value) % 24) * 60 + Number(p.find((x) => x.type === 'minute')!.value)
    const d = hours.find((h) => h.day === wd)
    if (!d || d.closed) return false
    const m = (t: string) => { const [a, b] = t.split(':').map(Number); return a * 60 + (b || 0) }
    return m(d.close) > m(d.open) ? cur >= m(d.open) && cur < m(d.close) : cur >= m(d.open) || cur < m(d.close)
  } catch { return false }
}

type Session = { table: TableInfo | null; manualTableMode: string; tables: Array<{ publicId: string; number: string; location: string }> }

type Ctx = {
  lang: Lang
  settings: PublicSettings | null
  categories: Category[]
  loading: boolean
  loadError: boolean
  reload: () => void
  session: Session | null
  refreshSession: () => Promise<void>
  pickTable: (publicId: string) => Promise<string | null>
  cart: CartLine[]
  cartCount: number
  quote: Quote | null
  quoteError: string | null
  quoting: boolean
  addLine: (l: Omit<CartLine, 'key'>, replaceKey?: string) => void
  setQty: (key: string, q: number) => void
  removeLine: (key: string) => void
  clearCart: () => void
  note: string
  setNote: (s: string) => void
  placeOrder: () => Promise<string | null>
  placing: boolean
  cartOpen: boolean
  setCartOpen: (b: boolean) => void
  itemView: { item: MenuItem; line?: CartLine } | null
  openItem: (item: MenuItem, line?: CartLine) => void
  closeItem: () => void
  orders: StoredOrder[]
}

export type StoredOrder = { token: string; at: number }

const OrderingContext = createContext<Ctx | null>(null)
export const useOrdering = () => {
  const c = useContext(OrderingContext)
  if (!c) throw new Error('useOrdering outside provider')
  return c
}

const CART_KEY = 'sb_cart_v1'
const ORDERS_KEY = 'sb_orders_v1'
const uid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`)

function readLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
function writeLS(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode */ }
}

export function OrderingProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const router = useRouter()
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [note, setNote] = useState('')
  const [placing, setPlacing] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [itemView, setItemView] = useState<Ctx['itemView']>(null)
  const [orders, setOrders] = useState<StoredOrder[]>([])
  const idemKey = useRef<string>('')

  const loadMenu = useCallback(async () => {
    try {
      const r = await fetch(STATIC_SITE ? `${BASE_PATH}/static-menu.json` : '/api/menu', { cache: 'no-store' })
      if (!r.ok) throw new Error()
      const d = await r.json()
      if (STATIC_SITE) {
        // Menu preview only: ordering needs the restaurant's server.
        const pre = (u: string) => (u.startsWith('/') ? BASE_PATH + u : u)
        d.settings = { ...d.settings, orderingEnabled: false, manualTableMode: 'off', isOpen: openNow(d.settings.hours, d.settings.timezone) }
        d.categories = d.categories.map((c: Category) => ({ ...c, items: c.items.map((i) => ({ ...i, image: pre(i.image) })) }))
      }
      setSettings(d.settings)
      setCategories(d.categories)
      setLoadError(false)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshSession = useCallback(async () => {
    if (STATIC_SITE) { setSession({ table: null, manualTableMode: 'off', tables: [] }); return }
    try {
      const r = await fetch('/api/session', { cache: 'no-store' })
      if (r.ok) setSession(await r.json())
    } catch { /* offline: keep what we have */ }
  }, [])

  useEffect(() => {
    setCart(readLS<CartLine[]>(CART_KEY, []))
    setOrders(readLS<StoredOrder[]>(ORDERS_KEY, []))
    setHydrated(true)
    void loadMenu()
    void refreshSession()
    const iv = window.setInterval(loadMenu, 60_000)
    const onVis = () => { if (document.visibilityState === 'visible') { void loadMenu(); void refreshSession() } }
    document.addEventListener('visibilitychange', onVis)
    return () => { window.clearInterval(iv); document.removeEventListener('visibilitychange', onVis) }
  }, [loadMenu, refreshSession])

  useEffect(() => { if (hydrated) writeLS(CART_KEY, cart) }, [cart, hydrated])

  // Server-side price quote: the tray always shows what the backend will charge.
  useEffect(() => {
    if (!hydrated) return
    if (cart.length === 0) { setQuote(null); setQuoteError(null); return }
    const ctrl = new AbortController()
    setQuoting(true)
    const t = window.setTimeout(async () => {
      try {
        const r = await fetch('/api/orders/quote', {
          method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctrl.signal,
          body: JSON.stringify({ lines: cart.map((l) => ({ itemId: l.itemId, quantity: l.quantity, optionIds: l.optionIds, instructions: l.instructions })) }),
        })
        const d = await r.json()
        if (r.ok) { setQuote(d); setQuoteError(null) } else { setQuote(null); setQuoteError(d.error ?? 'error') }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setQuoteError('network')
      } finally { setQuoting(false) }
    }, 250)
    return () => { ctrl.abort(); window.clearTimeout(t) }
  }, [cart, hydrated, categories])

  const addLine: Ctx['addLine'] = useCallback((l, replaceKey) => {
    setCart((prev) => {
      const same = (a: CartLine) =>
        a.itemId === l.itemId && a.instructions === l.instructions &&
        [...a.optionIds].sort().join() === [...l.optionIds].sort().join()
      if (replaceKey) {
        const rest = prev.filter((x) => x.key !== replaceKey)
        const merge = rest.find(same)
        if (merge) return rest.map((x) => (x === merge ? { ...x, quantity: Math.min(50, x.quantity + l.quantity) } : x))
        return prev.map((x) => (x.key === replaceKey ? { ...l, key: replaceKey } : x))
      }
      const hit = prev.find(same)
      if (hit) return prev.map((x) => (x === hit ? { ...x, quantity: Math.min(50, x.quantity + l.quantity) } : x))
      return [...prev, { ...l, key: uid() }]
    })
    idemKey.current = ''
  }, [])

  const setQty = useCallback((key: string, q: number) => {
    setCart((p) => (q <= 0 ? p.filter((l) => l.key !== key) : p.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, q) } : l))))
    idemKey.current = ''
  }, [])
  const removeLine = useCallback((key: string) => { setCart((p) => p.filter((l) => l.key !== key)); idemKey.current = '' }, [])
  const clearCart = useCallback(() => { setCart([]); setNote(''); idemKey.current = '' }, [])

  const pickTable = useCallback(async (publicId: string) => {
    const r = await fetch('/api/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ publicId }) })
    if (!r.ok) return (await r.json().catch(() => ({}))).error ?? 'error'
    await refreshSession()
    return null
  }, [refreshSession])

  const placeOrder = useCallback(async () => {
    if (placing || cart.length === 0) return null
    setPlacing(true)
    // One key per tray content: a double-tap or a retry after a network blip cannot create two orders.
    if (!idemKey.current) idemKey.current = uid()
    try {
      const r = await fetch('/api/orders', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          lines: cart.map((l) => ({ itemId: l.itemId, quantity: l.quantity, optionIds: l.optionIds, instructions: l.instructions })),
          note, idempotencyKey: idemKey.current,
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) return `E:${d.error ?? 'error'}`
      const next = [{ token: d.trackToken as string, at: Date.now() }, ...readLS<StoredOrder[]>(ORDERS_KEY, [])].slice(0, 20)
      writeLS(ORDERS_KEY, next)
      setOrders(next)
      clearCart()
      setCartOpen(false)
      router.push(`/order/${d.trackToken}`)
      return null
    } catch {
      return 'E:network'
    } finally {
      setPlacing(false)
    }
  }, [cart, note, placing, clearCart, router])

  const value = useMemo<Ctx>(() => ({
    lang, settings, categories, loading, loadError, reload: loadMenu, session, refreshSession, pickTable,
    cart, cartCount: cart.reduce((s, l) => s + l.quantity, 0), quote, quoteError, quoting,
    addLine, setQty, removeLine, clearCart, note, setNote, placeOrder, placing,
    cartOpen, setCartOpen, itemView, openItem: (item, line) => setItemView({ item, line }), closeItem: () => setItemView(null), orders,
  }), [lang, settings, categories, loading, loadError, loadMenu, session, refreshSession, pickTable, cart, quote, quoteError, quoting, addLine, setQty, removeLine, clearCart, note, placeOrder, placing, cartOpen, itemView, orders])

  return <OrderingContext.Provider value={value}>{children}</OrderingContext.Provider>
}
