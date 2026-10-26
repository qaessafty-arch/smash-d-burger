'use client'

import { useCallback, useState } from 'react'
import QRCode from 'qrcode'
import { BellRing, ClipboardList, Grid2x2, QrCode, ScanLine } from 'lucide-react'
import { StaffShell, useLive, useMe } from '@/components/staff/shell'
import { OrderDetail } from '@/components/staff/order-detail'
import { VerifyPanel } from '@/components/staff/verify-panel'
import { ago, api, iqd, STATUS_LABEL, type OrderLite } from '@/components/staff/api'

type Table = { id: number; number: string; location: string; occupied: boolean; waiter: string | null; waiterId: number | null; openOrders: number; openRequests: number }
type Req = { id: number; type: string; status: string; table: string; handler: string | null; createdAt: string }

const FILTERS = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'verify', label: 'Verify', match: (s: string) => s === 'awaiting_verification' },
  { id: 'send', label: 'To send', match: (s: string) => s === 'verified' },
  { id: 'kitchen', label: 'Kitchen', match: (s: string) => s === 'confirmed' || s === 'preparing' },
  { id: 'ready', label: 'Ready', match: (s: string) => s === 'ready' },
  { id: 'served', label: 'Served', match: (s: string) => s === 'served' },
]

export default function WaiterPage() {
  return <StaffShell roles={['waiter', 'manager', 'admin']} title="Waiter"><Board /></StaffShell>
}

function Board() {
  useMe()
  const [tab, setTab] = useState<'orders' | 'verify' | 'tables' | 'requests'>('orders')
  const [orders, setOrders] = useState<OrderLite[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [reqs, setReqs] = useState<Req[]>([])
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const [o, t, r] = await Promise.all([
        api<{ orders: OrderLite[] }>('GET', '/api/staff/orders?scope=active&limit=100'),
        api<{ tables: Table[] }>('GET', '/api/staff/tables'),
        api<{ requests: Req[] }>('GET', '/api/staff/requests'),
      ])
      setOrders(o.orders); setTables(t.tables); setReqs(r.requests); setNow(Date.now()); setError('')
    } catch (e) { setError((e as Error).message) }
  }, [])
  useLive(refresh)

  const pendingVerify = orders.filter((o) => o.status === 'awaiting_verification').length
  const readyN = orders.filter((o) => o.status === 'ready').length
  const f = FILTERS.find((x) => x.id === filter)!
  const shown = orders.filter((o) => f.match(o.status))

  return (
    <main className="st-main">
      {error && <p className="st-error" role="alert">{error}</p>}
      <div className="st-stats">
        <button onClick={() => { setTab('orders'); setFilter('verify') }}><b>{pendingVerify}</b><span>To verify</span></button>
        <button onClick={() => { setTab('orders'); setFilter('send') }}><b>{orders.filter((o) => o.status === 'verified').length}</b><span>To send</span></button>
        <button onClick={() => { setTab('orders'); setFilter('ready') }}><b>{readyN}</b><span>Ready</span></button>
        <button onClick={() => setTab('requests')}><b>{reqs.length}</b><span>Requests</span></button>
      </div>

      <nav className="st-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'orders'} onClick={() => setTab('orders')}><ClipboardList size={17} /> Orders</button>
        <button role="tab" aria-selected={tab === 'verify'} onClick={() => setTab('verify')}><ScanLine size={17} /> Verify</button>
        <button role="tab" aria-selected={tab === 'tables'} onClick={() => setTab('tables')}><Grid2x2 size={17} /> Tables</button>
        <button role="tab" aria-selected={tab === 'requests'} onClick={() => setTab('requests')}><BellRing size={17} /> Requests{reqs.length > 0 && <i>{reqs.length}</i>}</button>
      </nav>

      {tab === 'orders' && (
        <>
          <div className="st-chips">{FILTERS.map((x) => <button key={x.id} aria-pressed={filter === x.id} onClick={() => setFilter(x.id)}>{x.label}</button>)}</div>
          {shown.length === 0 ? <p className="st-empty">No orders here right now.</p> : (
            <div className="st-cards">
              {shown.map((o) => (
                <button key={o.id} className={`st-card s-${o.status}`} onClick={() => setOpen(o.id)}>
                  <span className="st-card-table">{o.tableNumber}<small>Table</small></span>
                  <span className="st-card-main">
                    <b>{o.label}</b>
                    <span className={`st-badge s-${o.status}`}>{STATUS_LABEL[o.status]}</span>
                    <small>{o.itemCount} item{o.itemCount === 1 ? '' : 's'} · {iqd(o.total)} · {ago(o.createdAt, now)} ago</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'verify' && <VerifyPanel onDone={refresh} />}

      {tab === 'tables' && <Tables tables={tables} />}

      {tab === 'requests' && (
        reqs.length === 0 ? <p className="st-empty">No open requests.</p> : (
          <ul className="st-reqs">
            {reqs.map((r) => (
              <li key={r.id} className={`s-${r.status}`}>
                <span className="st-card-table">{r.table}<small>Table</small></span>
                <div><b>{r.type === 'bill' ? 'Bill request' : r.type === 'waiter' ? 'Waiter assistance' : r.type}</b><small>{ago(r.createdAt, now)} ago · {r.status.replace(/_/g, ' ')}{r.handler ? ` · ${r.handler}` : ''}</small></div>
                <div className="st-actions">
                  {r.status === 'waiting' && <button className="st-btn" onClick={async () => { await api('PATCH', '/api/staff/requests', { id: r.id, status: 'received' }); void refresh() }}>Received</button>}
                  {r.status !== 'on_the_way' && <button className="st-btn" onClick={async () => { await api('PATCH', '/api/staff/requests', { id: r.id, status: 'on_the_way' }); void refresh() }}>On the way</button>}
                  <button className="st-btn primary" onClick={async () => { await api('PATCH', '/api/staff/requests', { id: r.id, status: 'completed' }); void refresh() }}>Done</button>
                </div>
              </li>
            ))}
          </ul>
        )
      )}

      {open && <OrderDetail id={open} onClose={() => setOpen(null)} onChanged={refresh} goVerify={() => { setOpen(null); setTab('verify') }} />}
    </main>
  )
}

function Tables({ tables }: { tables: Table[] }) {
  const [qr, setQr] = useState<{ table: string; img: string } | null>(null)
  const [err, setErr] = useState('')
  const assist = async (t: Table) => {
    setErr('')
    try {
      const d = await api<{ url: string }>('POST', '/api/staff/tables', { tableId: t.id })
      setQr({ table: t.number, img: await QRCode.toDataURL(d.url, { margin: 1, width: 480 }) })
    } catch (e) { setErr((e as Error).message) }
  }
  return (
    <>
      {err && <p className="st-error">{err}</p>}
      <div className="st-tables">
        {tables.map((t) => (
          <div key={t.id} className={`st-tbl ${t.occupied ? 'busy' : ''}`}>
            <b>{t.number}</b>
            <small>{t.location || ' '}</small>
            <small>{t.occupied ? `${t.openOrders} open order${t.openOrders === 1 ? '' : 's'}` : 'Free'}{t.openRequests > 0 && ` · ${t.openRequests} request`}</small>
            {t.waiter && <small>Waiter: {t.waiter}</small>}
            <button className="st-btn sm" onClick={() => assist(t)}><QrCode size={14} /> Start session</button>
          </div>
        ))}
      </div>
      {qr && (
        <div className="st-drawer-wrap center" onMouseDown={(e) => e.target === e.currentTarget && setQr(null)}>
          <div className="st-modal">
            <h3>Table {qr.table}: customer session</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr.img} alt="Session QR code" />
            <p className="st-muted">Let the customer scan this with their camera. It works once and expires in 15 minutes.</p>
            <button className="st-btn primary" onClick={() => setQr(null)}>Done</button>
          </div>
        </div>
      )}
    </>
  )
}
