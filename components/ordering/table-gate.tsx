'use client'

import { useState } from 'react'
import { MapPin, QrCode } from 'lucide-react'
import { useOrdering } from './provider'
import { tr } from './i18n'

/** Shows the active table, or lets the customer pick one when the restaurant allows it. */
export function TableBanner({ compact = false }: { compact?: boolean }) {
  const { session, lang, pickTable, refreshSession } = useOrdering()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [open, setOpen] = useState(false)
  if (!session) return null
  const t = session.table
  const canPick = session.manualTableMode === 'open'

  const choose = async (publicId: string) => {
    setBusy(true); setErr('')
    const e = await pickTable(publicId)
    setBusy(false)
    if (e) setErr(e); else setOpen(false)
  }
  const leave = async () => { await fetch('/api/session', { method: 'DELETE' }); await refreshSession(); setOpen(true) }

  if (t && !open) {
    return (
      <div className={`ox-table ${compact ? 'compact' : ''}`}>
        <span className="ox-table-badge"><MapPin size={15} /> {tr(lang, 'table')} {t.number}</span>
        {t.location && <span className="ox-table-loc">{t.location}</span>}
        {canPick && !t.trusted && <button type="button" className="ox-link" onClick={leave}>{tr(lang, 'changeTable')}</button>}
      </div>
    )
  }
  return (
    <div className={`ox-table gate ${compact ? 'compact' : ''}`}>
      {canPick ? (
        <>
          <p><MapPin size={15} /> {tr(lang, 'chooseTable')}</p>
          <div className="ox-table-grid">
            {session.tables.length === 0 && <small>—</small>}
            {session.tables.map((x) => (
              <button key={x.publicId} type="button" disabled={busy} onClick={() => choose(x.publicId)}>{x.number}</button>
            ))}
          </div>
          {err && <small className="ox-err">{err}</small>}
        </>
      ) : (
        <p><QrCode size={16} /> {tr(lang, 'scanQr')}</p>
      )}
    </div>
  )
}
