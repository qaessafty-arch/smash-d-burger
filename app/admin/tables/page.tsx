'use client'

import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Download, Printer, RefreshCw } from 'lucide-react'
import { api, ApiErr } from '@/components/staff/api'
import { useMe } from '@/components/staff/shell'

type T = { id: number; number: string; location: string; active: boolean; occupied: boolean; waiterId: number | null; waiter: string | null; openOrders: number; qrUrl: string }
type Staff = { id: number; name: string; role: string; active: boolean }

export default function TablesAdmin() {
  const { me, restaurant } = useMe()
  const [tables, setTables] = useState<T[]>([])
  const [waiters, setWaiters] = useState<Staff[]>([])
  const [qr, setQr] = useState<Record<number, string>>({})
  const [bulk, setBulk] = useState({ count: 10, start: 1, location: '' })
  const [one, setOne] = useState({ number: '', location: '' })
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try {
      const d = await api<{ tables: T[] }>('GET', '/api/admin/tables'); setTables(d.tables)
      const imgs: Record<number, string> = {}
      await Promise.all(d.tables.map(async (t) => { imgs[t.id] = await QRCode.toDataURL(t.qrUrl, { margin: 2, width: 600, errorCorrectionLevel: 'M' }) }))
      setQr(imgs)
      if (me.role === 'admin') setWaiters((await api<{ staff: Staff[] }>('GET', '/api/admin/staff')).staff.filter((s) => s.role === 'waiter' && s.active))
      setErr('')
    } catch (e) { setErr((e as Error).message) }
  }, [me.role])
  useEffect(() => { void load() }, [load])

  const run = async (fn: () => Promise<unknown>) => { try { await fn(); await load() } catch (e) { setErr(e instanceof ApiErr ? e.message : 'Failed') } }
  const patch = (id: number, body: object) => run(() => api('PATCH', '/api/admin/tables', { id, ...body }))

  const printAll = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>Table QR codes</title><style>body{font-family:system-ui;margin:0}.p{display:inline-block;width:46%;margin:2%;text-align:center;page-break-inside:avoid;border:2px solid #171717;border-radius:12px;padding:16px;box-sizing:border-box}img{width:100%}h1{font-size:54px;margin:4px 0}h2{margin:0;font-size:18px}p{margin:6px 0 0;color:#555}</style></head><body>${tables.filter((t) => t.active).map((t) => `<div class="p"><h2>${esc(restaurant)}</h2><h1>Table ${esc(t.number)}</h1><img src="${qr[t.id]}"/><p>Scan to see the menu and order from your table</p></div>`).join('')}<script>onload=()=>print()</script></body></html>`)
    w.document.close()
  }

  return (
    <>
      <div className="ad-head"><h1>Tables & QR codes</h1><button className="st-btn" onClick={printAll} disabled={!tables.length}><Printer size={15} /> Print all QR codes</button></div>
      {err && <p className="st-error" role="alert">{err}</p>}
      <ol className="ad-howto">
        <li><b>Add your tables</b> below. Each one gets its own private QR code automatically.</li>
        <li><b>Print the QR codes</b> (all at once, or download one table's PNG) and put each one on its table.</li>
        <li><b>That's the connection.</b> When a guest scans a table's QR code, their order is linked to that table. Nothing else to set up.</li>
      </ol>
      <div className="ad-two">
        <form className="ad-panel ad-inline" onSubmit={(e) => { e.preventDefault(); void run(() => api('POST', '/api/admin/tables', bulk)) }}>
          <h2>Add several tables</h2>
          <label>How many<input type="number" min={1} max={200} value={bulk.count} onChange={(e) => setBulk({ ...bulk, count: Number(e.target.value) })} /></label>
          <label>Starting at<input type="number" min={1} value={bulk.start} onChange={(e) => setBulk({ ...bulk, start: Number(e.target.value) })} /></label>
          <label>Location<input value={bulk.location} onChange={(e) => setBulk({ ...bulk, location: e.target.value })} placeholder="Main hall" /></label>
          <button className="st-btn primary">Add</button>
        </form>
        <form className="ad-panel ad-inline" onSubmit={(e) => { e.preventDefault(); void run(async () => { await api('POST', '/api/admin/tables', one); setOne({ number: '', location: '' }) }) }}>
          <h2>Add one table</h2>
          <label>Number or name<input required value={one.number} onChange={(e) => setOne({ ...one, number: e.target.value })} placeholder="12 or VIP-1" /></label>
          <label>Location<input value={one.location} onChange={(e) => setOne({ ...one, location: e.target.value })} placeholder="Terrace" /></label>
          <button className="st-btn primary">Add</button>
        </form>
      </div>
      {tables.length === 0 && <p className="st-muted">No tables yet. Add your tables above, then print their QR codes.</p>}
      <div className="ad-tables">
        {tables.map((t) => (
          <article key={t.id} className={`ad-tbl ${t.active ? '' : 'off'}`}>
            <header><b>Table {t.number}</b><span className={`st-badge ${t.occupied ? 's-preparing' : 's-completed'}`}>{t.occupied ? `Occupied · ${t.openOrders} open` : 'Available'}</span></header>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {qr[t.id] && <img src={qr[t.id]} alt={`QR code for table ${t.number}`} />}
            <input defaultValue={t.location} placeholder="Location" aria-label="Location" onBlur={(e) => e.target.value !== t.location && void patch(t.id, { location: e.target.value })} />
            {me.role === 'admin' && (
              <select value={t.waiterId ?? ''} onChange={(e) => void patch(t.id, { waiterId: e.target.value ? Number(e.target.value) : null })} aria-label="Assigned waiter">
                <option value="">No waiter assigned</option>{waiters.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            )}
            <div className="st-actions">
              <a className="st-btn sm" download={`table-${t.number}-qr.png`} href={qr[t.id]}><Download size={13} /> PNG</a>
              <button className="st-btn sm" onClick={() => patch(t.id, { occupied: !t.occupied })}>{t.occupied ? 'Mark free' : 'Mark occupied'}</button>
              <button className="st-btn sm" onClick={() => patch(t.id, { active: !t.active })}>{t.active ? 'Disable' : 'Enable'}</button>
              <button className="st-btn sm" title="Invalidates the old printed QR" onClick={() => confirm(`Make a new QR for table ${t.number}? The printed one will stop working.`) && void patch(t.id, { regenerateQr: true })}><RefreshCw size={13} /> New QR</button>
              <button className="st-btn sm danger" onClick={() => confirm(`Delete table ${t.number}?`) && void run(() => api('DELETE', `/api/admin/tables?id=${t.id}`))}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
