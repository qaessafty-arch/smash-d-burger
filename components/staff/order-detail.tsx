'use client'

import { useEffect, useState } from 'react'
import { Check, Clock, MessageSquare, X } from 'lucide-react'
import { api, ApiErr, clock, iqd, STATUS_LABEL, type OrderFull } from './api'
import { useMe } from './shell'

const ACTION: Record<string, { label: string; cls?: string; ask?: boolean }> = {
  confirmed: { label: 'Confirm & send to kitchen', cls: 'primary' },
  preparing: { label: 'Start preparing', cls: 'primary' },
  ready: { label: 'Mark ready', cls: 'primary' },
  served: { label: 'Mark served', cls: 'primary' },
  completed: { label: 'Complete order', cls: 'primary' },
  rejected: { label: 'Reject', cls: 'danger', ask: true },
  cancelled: { label: 'Cancel order', cls: 'danger', ask: true },
}

export function OrderDetail({ id, onClose, onChanged, goVerify }: { id: string; onClose: () => void; onChanged: () => void; goVerify?: (code?: string) => void }) {
  const { me } = useMe()
  const [o, setO] = useState<OrderFull | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [target, setTarget] = useState('cancelled')
  const [note, setNote] = useState('')
  const [newCode, setNewCode] = useState('')

  const load = async () => {
    try { const d = await api<{ order: OrderFull }>('GET', `/api/staff/orders/${id}`); setO(d.order); setNote(d.order.internalNote) } catch (e) { setErr((e as Error).message) }
  }
  useEffect(() => { void load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const move = async (to: string, why?: string) => {
    setBusy(true); setErr('')
    try {
      const d = await api<{ order: OrderFull }>('POST', `/api/staff/orders/${id}/transition`, { to, reason: why })
      setO(d.order); setReason(null); onChanged()
    } catch (e) { setErr(e instanceof ApiErr ? e.message : 'Failed') } finally { setBusy(false) }
  }
  const saveNote = async () => { try { await api('POST', `/api/staff/orders/${id}/note`, { note }); onChanged() } catch (e) { setErr((e as Error).message) } }
  const reissue = async () => { try { const d = await api<{ code: string }>('POST', `/api/staff/orders/${id}/reissue`); setNewCode(d.code) } catch (e) { setErr((e as Error).message) } }

  const allowedMine = (o?.allowed ?? []).filter((a) => a.roles.includes(me.role) && ACTION[a.to] && a.to !== 'verified')
  const mine = allowedMine.some((a) => a.to === 'rejected') ? allowedMine.filter((a) => a.to !== 'cancelled') : allowedMine
  const canVerify = o?.status === 'awaiting_verification' && me.role !== 'kitchen'

  return (
    <div className="st-drawer-wrap" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <aside className="st-drawer" role="dialog" aria-modal="true" aria-label="Order details">
        <header>
          <div>
            <b className="st-big">{o ? o.label : '…'}</b>
            {o && <span className={`st-badge s-${o.status}`}>{STATUS_LABEL[o.status] ?? o.status}</span>}
          </div>
          <button type="button" className="st-icon" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>
        {!o ? <p className="st-muted pad">{err || 'Loading…'}</p> : (
          <div className="st-drawer-body">
            <div className="st-table-tag">Table <b>{o.tableNumber}</b></div>
            <p className="st-muted"><Clock size={13} /> Placed {clock(o.createdAt)}{o.verifiedAt && <> · verified by <b>{o.verifiedBy}</b> at {clock(o.verifiedAt)}</>}</p>
            {o.cancelReason && <p className="st-warn">Reason: {o.cancelReason}</p>}
            {o.customerNote && <p className="st-callout"><MessageSquare size={14} /> {o.customerNote}</p>}
            <ul className="st-items">
              {o.items.map((it, i) => (
                <li key={i}>
                  <b>{it.quantity}× {it.name}</b><span>{iqd(it.lineTotal)}</span>
                  {it.options.length > 0 && <small>{it.options.map((x) => x.name).join(' · ')}</small>}
                  {it.instructions && <em>“{it.instructions}”</em>}
                </li>
              ))}
            </ul>
            <dl className="st-sum">
              <div><dt>Subtotal</dt><dd>{iqd(o.subtotal)}</dd></div>
              {o.tax > 0 && <div><dt>Tax</dt><dd>{iqd(o.tax)}</dd></div>}
              {o.serviceCharge > 0 && <div><dt>Service</dt><dd>{iqd(o.serviceCharge)}</dd></div>}
              <div className="t"><dt>Total</dt><dd>{iqd(o.total)}</dd></div>
            </dl>

            {err && <p className="st-error" role="alert">{err}</p>}
            {canVerify && (
              <div className="st-actions">
                {goVerify && <button className="st-btn primary" onClick={() => goVerify()}>Verify with code / QR</button>}
                <button className="st-btn" onClick={reissue}>Issue new code</button>
              </div>
            )}
            {newCode && <p className="st-callout">New code (tell the customer): <b className="st-code">{newCode}</b></p>}

            {reason === null ? (
              <div className="st-actions">
                {mine.map((a) => (
                  <button key={a.to} disabled={busy} className={`st-btn ${ACTION[a.to].cls ?? ''}`} onClick={() => { if (ACTION[a.to].ask) { setTarget(a.to); setReason('') } else void move(a.to) }}>{ACTION[a.to].label}</button>
                ))}
              </div>
            ) : (
              <div className="st-reason">
                <label>Reason (required)<input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="e.g. Customer left, wrong table" /></label>
                <div className="st-actions">
                  <button className="st-btn danger" disabled={busy || !reason.trim()} onClick={() => move(target, reason)}>Confirm</button>
                  <button className="st-btn" onClick={() => setReason(null)}>Back</button>
                </div>
              </div>
            )}

            {me.role !== 'kitchen' && (
              <label className="st-note">Internal note (staff only)
                <textarea rows={2} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== o.internalNote && saveNote()} />
              </label>
            )}
            <h4>History</h4>
            <ol className="st-history">
              {o.timeline.map((h, i) => (
                <li key={i}><Check size={12} /> <b>{STATUS_LABEL[h.to] ?? h.to}</b> <span>{clock(h.at)} · {h.by}{h.note ? ` · ${h.note}` : ''}</span></li>
              ))}
            </ol>
          </div>
        )}
      </aside>
    </div>
  )
}
