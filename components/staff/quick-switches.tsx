'use client'

import { useCallback, useEffect, useState } from 'react'
import { api, ApiErr } from './api'

type Sw = { orderingEnabled: boolean; deliveryEnabled: boolean; manualTableMode: 'open' | 'waiter_only' | 'off'; requestTypes: string[]; notice: string }
const REQ: Array<[string, string]> = [['waiter', 'Call waiter'], ['bill', 'Bill request'], ['water', 'Water'], ['utensils', 'Utensils'], ['napkins', 'Napkins']]

/** Pause anything for a while with one tap. Takes effect for guests within seconds. */
export function QuickSwitches() {
  const [s, setS] = useState<Sw | null>(null)
  const [notice, setNotice] = useState('')
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState('')

  const load = useCallback(async () => {
    try { const d = await api<{ switches: Sw }>('GET', '/api/admin/switches'); setS(d.switches); setNotice(d.switches.notice) } catch (e) { setErr((e as Error).message) }
  }, [])
  useEffect(() => { void load() }, [load])

  const save = async (patch: Partial<Sw>, label: string) => {
    setErr(''); setSaved('')
    try { const d = await api<{ switches: Sw }>('PUT', '/api/admin/switches', patch); setS(d.switches); setSaved(label) } catch (e) { setErr(e instanceof ApiErr ? e.message : 'Could not save') }
  }
  if (!s) return err ? <p className="st-error">{err}</p> : null

  const Toggle = ({ on, label, hint, onChange }: { on: boolean; label: string; hint: string; onChange: (v: boolean) => void }) => (
    <label className={`qs-toggle ${on ? '' : 'off'}`}>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span className="qs-track" aria-hidden="true"><i /></span>
      <span className="qs-text"><b>{label}</b><small>{on ? hint : 'Paused'}</small></span>
    </label>
  )
  const paused = [!s.orderingEnabled && 'table ordering', !s.deliveryEnabled && 'delivery'].filter(Boolean)

  return (
    <section className="ad-panel qs">
      <div className="ad-panel-head"><h2>Quick switches</h2>{paused.length > 0 && <span className="st-badge s-cancelled">Paused: {paused.join(', ')}</span>}</div>
      <div className="qs-grid">
        <Toggle on={s.orderingEnabled} label="Table ordering" hint="Guests can order from their table" onChange={(v) => save({ orderingEnabled: v }, v ? 'Table ordering is on' : 'Table ordering paused')} />
        <Toggle on={s.deliveryEnabled} label="Delivery" hint="Delivery button is shown on the website" onChange={(v) => save({ deliveryEnabled: v }, v ? 'Delivery is on' : 'Delivery paused')} />
        <Toggle on={s.manualTableMode !== 'off'} label="Guests can pick their own table" hint="Orders are still verified by a waiter" onChange={(v) => save({ manualTableMode: v ? 'open' : 'off' }, v ? 'Table picking is on' : 'Table picking is off (QR only)')} />
      </div>
      <p className="qs-label">Guest requests</p>
      <div className="qs-chips">
        {REQ.map(([k, l]) => {
          const on = s.requestTypes.includes(k)
          return <button key={k} type="button" aria-pressed={on} className={on ? 'on' : ''} onClick={() => save({ requestTypes: on ? s.requestTypes.filter((x) => x !== k) : [...s.requestTypes, k] }, `${l} ${on ? 'paused' : 'is on'}`)}>{l}</button>
        })}
      </div>
      <form className="qs-notice" onSubmit={(e) => { e.preventDefault(); void save({ notice }, notice ? 'Notice is showing to guests' : 'Notice removed') }}>
        <label htmlFor="qs-notice" className="qs-label">Message shown to guests (optional)</label>
        <div>
          <input id="qs-notice" value={notice} maxLength={200} placeholder="e.g. Kitchen closed 3 to 5 pm. Drinks only." onChange={(e) => setNotice(e.target.value)} />
          <button className="st-btn primary">Show</button>
          {s.notice && <button type="button" className="st-btn" onClick={() => { setNotice(''); void save({ notice: '' }, 'Notice removed') }}>Remove</button>}
        </div>
      </form>
      <p className="st-muted small">Hide a whole category or mark one dish sold out in <b>Menu</b>. Changes reach guests within a minute.</p>
      {saved && <p className="st-ok" role="status">{saved}</p>}
      {err && <p className="st-error" role="alert">{err}</p>}
    </section>
  )
}
