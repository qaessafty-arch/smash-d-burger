'use client'

import { useCallback, useEffect, useState } from 'react'
import { BellRing, Check, Receipt, X } from 'lucide-react'
import { useOrdering } from './provider'
import { tr } from './i18n'
import { Sheet } from './parts'

type Req = { id: number; type: string; status: string }

export function ServiceFab() {
  const { session, settings, lang, cartCount } = useOrdering()
  const [open, setOpen] = useState(false)
  const [reqs, setReqs] = useState<Req[]>([])
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/requests', { cache: 'no-store' })
      if (r.ok) setReqs((await r.json()).requests)
    } catch { /* keep last known */ }
  }, [])

  useEffect(() => {
    if (!session?.table) return
    void load()
    const iv = window.setInterval(load, open ? 6000 : 20000)
    return () => window.clearInterval(iv)
  }, [session?.table, open, load])

  if (!session?.table || !settings) return null

  const send = async (type: string) => {
    setMsg('')
    const r = await fetch('/api/requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type }) })
    if (r.ok) { setMsg(tr(lang, 'reqSent')); await load() } else setMsg((await r.json().catch(() => ({}))).error ?? tr(lang, 'error'))
  }
  const waiting = reqs.length

  return (
    <>
      <button type="button" className={`ox-fab ${cartCount ? 'raised' : ''}`} onClick={() => setOpen(true)} aria-label={tr(lang, 'callWaiter')}>
        <BellRing size={20} />
        <span>{tr(lang, 'callWaiter')}</span>
        {waiting > 0 && <i>{waiting}</i>}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label={tr(lang, 'help')}>
        <div className="ox-service">
          <header className="ox-cart-head">
            <h2><BellRing size={19} /> {tr(lang, 'help')} · {tr(lang, 'table')} {session.table.number}</h2>
            <button type="button" className="ox-x light" onClick={() => setOpen(false)} aria-label={tr(lang, 'close')}><X size={18} /></button>
          </header>
          <ul className="ox-req-list">
            {settings.requestTypes.map((type) => {
              const cur = reqs.find((r) => r.type === type)
              return (
                <li key={type}>
                  <button type="button" disabled={!!cur} onClick={() => send(type)}>
                    {type === 'bill' ? <Receipt size={18} /> : <BellRing size={18} />}
                    <span>{tr(lang, `req_${type}`) === `req_${type}` ? type : tr(lang, `req_${type}`)}</span>
                    {cur && <em><Check size={13} /> {tr(lang, `st_${cur.status}`)}</em>}
                  </button>
                </li>
              )
            })}
          </ul>
          {msg && <p className="ox-note-ok" role="status">{msg}</p>}
        </div>
      </Sheet>
    </>
  )
}
