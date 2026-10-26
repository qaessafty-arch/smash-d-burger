'use client'

import { useCallback, useState } from 'react'
import { useLive } from '@/components/staff/shell'
import { api, iqd } from '@/components/staff/api'
import { QuickSwitches } from '@/components/staff/quick-switches'

type Stats = {
  days: number; totalOrders: number; activeOrders: number; pendingVerification: number; preparing: number; ready: number
  completed: number; cancelled: number; totalSales: number; activeTables: number
  popular: Array<{ name: string; qty: number; revenue: number }>; byDay: Array<{ day: string; orders: number; sales: number }>
}

export default function Dashboard() {
  const [s, setS] = useState<Stats | null>(null)
  const [days, setDays] = useState(30)
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    try { setS(await api<Stats>('GET', `/api/admin/stats?days=${days}`)); setErr('') } catch (e) { setErr((e as Error).message) }
  }, [days])
  useLive(load, 15000)

  const max = Math.max(1, ...(s?.byDay.map((d) => d.sales) ?? [1]))
  const cards: Array<[string, string | number, string?]> = s ? [
    ['Active orders', s.activeOrders, 'accent'], ['Pending verification', s.pendingVerification, s.pendingVerification ? 'warn' : ''], ['In kitchen', s.preparing],
    ['Ready to serve', s.ready], ['Active tables', s.activeTables], [`Orders (${days}d)`, s.totalOrders], [`Completed (${days}d)`, s.completed],
    [`Cancelled (${days}d)`, s.cancelled], [`Sales (${days}d)`, iqd(s.totalSales), 'accent'],
  ] : []

  return (
    <>
      <div className="ad-head"><h1>Dashboard</h1>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Period">
          <option value={1}>Today</option><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option>
        </select>
      </div>
      <QuickSwitches />
      {err && <p className="st-error">{err}</p>}
      {!s ? <p className="st-muted">Loading…</p> : (
        <>
          <div className="ad-cards">{cards.map(([k, v, c]) => <div key={k} className={`ad-card ${c ?? ''}`}><small>{k}</small><b>{v}</b></div>)}</div>
          <p className="st-muted small">Sales count served and completed orders only. Everything on this page is calculated from your real orders.</p>
          <div className="ad-two">
            <section className="ad-panel">
              <h2>Popular items</h2>
              {s.popular.length === 0 ? <p className="st-muted">No orders yet.</p> : (
                <ol className="ad-rank">{s.popular.map((p) => <li key={p.name}><b>{p.name}</b><span>{p.qty} sold</span><em>{iqd(p.revenue)}</em></li>)}</ol>
              )}
            </section>
            <section className="ad-panel">
              <h2>Sales by day</h2>
              {s.byDay.length === 0 ? <p className="st-muted">No orders yet.</p> : (
                <div className="ad-bars" role="img" aria-label="Sales by day">
                  {s.byDay.map((d) => <div key={d.day} title={`${d.day}: ${iqd(d.sales)} · ${d.orders} orders`}><i style={{ height: `${Math.max(3, (d.sales / max) * 100)}%` }} /><small>{d.day.slice(5)}</small></div>)}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  )
}
