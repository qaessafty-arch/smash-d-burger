'use client'

import { useCallback, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { useLive } from '@/components/staff/shell'
import { OrderDetail } from '@/components/staff/order-detail'
import { api, clock, iqd, STATUS_LABEL, type OrderLite } from '@/components/staff/api'

const PAGE = 25

export default function OrdersPage() {
  const [rows, setRows] = useState<OrderLite[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState('')
  const [table, setTable] = useState('')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const p = new URLSearchParams({ limit: String(PAGE), offset: String(page * PAGE) })
    if (status) p.set('status', status)
    if (table) p.set('table', table)
    if (q) p.set('q', q)
    if (from) p.set('from', from)
    if (to) p.set('to', new Date(new Date(to).getTime() + 86400000).toISOString().slice(0, 10))
    try { const d = await api<{ orders: OrderLite[]; total: number }>('GET', `/api/staff/orders?${p}`); setRows(d.orders); setTotal(d.total); setErr('') } catch (e) { setErr((e as Error).message) }
  }, [page, status, table, q, from, to])
  useLive(load, 10000)

  const exp = new URLSearchParams()
  if (from) exp.set('from', from)
  if (to) exp.set('to', new Date(new Date(to).getTime() + 86400000).toISOString().slice(0, 10))

  return (
    <>
      <div className="ad-head"><h1>Orders</h1><a className="st-btn" href={`/api/admin/export?${exp}`}><Download size={15} /> Export CSV</a></div>
      <div className="ad-filters">
        <label className="ad-search"><Search size={15} /><input placeholder="Order number or table" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} /></label>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }} aria-label="Status"><option value="">All statuses</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input placeholder="Table" value={table} onChange={(e) => { setTable(e.target.value); setPage(0) }} aria-label="Table" style={{ width: 90 }} />
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0) }} aria-label="From" />
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0) }} aria-label="To" />
      </div>
      {err && <p className="st-error">{err}</p>}
      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead><tr><th>Order</th><th>Table</th><th>Time</th><th>Status</th><th>Verification</th><th>Items</th><th className="r">Total</th></tr></thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} onClick={() => setOpen(o.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(o.id)}>
                <td><b>{o.label}</b></td><td>{o.tableNumber}</td><td>{new Date(o.createdAt).toLocaleDateString('en-GB')} {clock(o.createdAt)}</td>
                <td><span className={`st-badge s-${o.status}`}>{STATUS_LABEL[o.status]}</span></td>
                <td>{o.verificationStatus.replace('_', ' ')}</td><td>{o.itemCount}</td><td className="r">{iqd(o.total)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="st-muted" style={{ textAlign: 'center', padding: 28 }}>No orders match.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="ad-pager">
        <span>{total} order{total === 1 ? '' : 's'}</span>
        <button className="st-btn sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page + 1} / {Math.max(1, Math.ceil(total / PAGE))}</span>
        <button className="st-btn sm" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(page + 1)}>Next</button>
      </div>
      {open && <OrderDetail id={open} onClose={() => setOpen(null)} onChanged={load} />}
    </>
  )
}
