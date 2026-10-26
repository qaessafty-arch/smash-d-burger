'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChefHat, Check, Flame, MessageSquare } from 'lucide-react'
import { StaffShell, useLive } from '@/components/staff/shell'
import { api, ApiErr, clock, type OrderFull } from '@/components/staff/api'

type KOrder = Omit<OrderFull, 'timeline'>

export default function KitchenPage() {
  return <StaffShell roles={['kitchen', 'manager', 'admin']} title="Kitchen" wide><Display /></StaffShell>
}

function mins(iso: string | null, now: number) { return iso ? Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000)) : 0 }

function Display() {
  const [orders, setOrders] = useState<KOrder[]>([])
  const [now, setNow] = useState(Date.now())
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState('')

  const refresh = useCallback(async () => {
    try { setOrders((await api<{ orders: KOrder[] }>('GET', '/api/staff/kitchen')).orders); setNow(Date.now()); setErr('') } catch (e) { setErr((e as Error).message) }
  }, [])
  useLive(refresh, 5000)
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(t) }, [])

  const move = async (id: string, to: string) => {
    setBusy(id)
    try { await api('POST', `/api/staff/orders/${id}/transition`, { to }); await refresh() } catch (e) { setErr(e instanceof ApiErr ? e.message : 'Failed') } finally { setBusy('') }
  }

  const col = (title: string, status: string, hint: string, action?: { to: string; label: string }) => {
    const list = orders.filter((o) => o.status === status)
    return (
      <section className={`st-kcol k-${status}`}>
        <h2>{title} <i>{list.length}</i></h2>
        {list.length === 0 && <p className="st-empty small">{hint}</p>}
        {list.map((o) => {
          const wait = mins(o.confirmedAt ?? o.createdAt, now)
          return (
            <article key={o.id} className={`st-kcard ${wait >= 15 && status !== 'ready' ? 'late' : ''}`}>
              <header>
                <span className="st-ktable">{o.tableNumber}<small>Table</small></span>
                <div><b>{o.label}</b><small>in {clock(o.confirmedAt ?? o.createdAt)} · {wait} min ago</small></div>
              </header>
              <ul>
                {o.items.map((it, i) => (
                  <li key={i}>
                    <b><span className="q">{it.quantity}×</span> {it.name}</b>
                    {it.options.length > 0 && <div className="opts">{it.options.map((x, j) => <span key={j} className={/^No /i.test(x.name) ? 'no' : ''}>{x.name}</span>)}</div>}
                    {it.instructions && <p className="note"><MessageSquare size={14} /> {it.instructions}</p>}
                  </li>
                ))}
              </ul>
              {o.customerNote && <p className="note big"><Flame size={15} /> {o.customerNote}</p>}
              {action && <button className="st-btn primary lg" disabled={busy === o.id} onClick={() => move(o.id, action.to)}>{action.to === 'ready' ? <Check size={18} /> : <ChefHat size={18} />} {action.label}</button>}
            </article>
          )
        })}
      </section>
    )
  }

  return (
    <main className="st-kitchen">
      {err && <p className="st-error" role="alert">{err}</p>}
      {col('New', 'confirmed', 'Nothing waiting. Verified orders appear here.', { to: 'preparing', label: 'Start preparing' })}
      {col('Preparing', 'preparing', 'Nothing on the grill.', { to: 'ready', label: 'Mark ready' })}
      {col('Ready', 'ready', 'Waiting for the waiter to pick up.')}
    </main>
  )
}
