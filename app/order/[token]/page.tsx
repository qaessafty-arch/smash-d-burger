'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { ArrowLeft, Bell, Check, Clock, Flame, Receipt, X } from 'lucide-react'
import { OrderingProvider } from '@/components/ordering/provider'
import { ServiceFab } from '@/components/ordering/service-fab'
import { fmtNum, money, tr, type Lang } from '@/components/ordering/i18n'

type Item = { name: string; quantity: number; lineTotal: number; instructions: string; options: Array<{ group: string; name: string; delta: number }> }
type Order = {
  id: string; number: number; label: string; tableNumber: string; status: string; total: number; subtotal: number; tax: number; serviceCharge: number
  items: Item[]; timeline: Array<{ to: string; at: string; by: string; note: string }>; verifyCode: string | null; verifyToken: string | null
  verifyExpiresAt: string | null; verifyExpired: boolean; estReadyMinutes: number | null; confirmedAt: string | null; cancelReason: string; createdAt: string
}

const STEPS = ['submitted', 'verification', 'kitchen', 'ready', 'done'] as const
function stepState(status: string) {
  // returns index of the step currently in progress (STEPS.length = everything done)
  switch (status) {
    case 'awaiting_verification': return 1
    case 'verified': case 'confirmed': case 'preparing': return 2
    case 'ready': return 3
    case 'served': return 4
    case 'completed': return 5
    default: return -1
  }
}

export default function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [lang, setLang] = useState<Lang>('EN')
  useEffect(() => {
    try { const l = localStorage.getItem('sb_lang'); if (l === 'EN' || l === 'KU' || l === 'AR') setLang(l) } catch { /* ignore */ }
  }, [])
  return (
    <OrderingProvider lang={lang}>
      <Tracker token={token} lang={lang} />
      <ServiceFab />
    </OrderingProvider>
  )
}

function Tracker({ token, lang }: { token: string; lang: Lang }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [restaurant, setRestaurant] = useState('')
  const [missing, setMissing] = useState(false)
  const [qr, setQr] = useState('')
  const [toast, setToast] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const last = useRef<string>('')
  const rtl = lang !== 'EN'

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/orders/${token}`, { cache: 'no-store' })
      if (r.status === 404) { setMissing(true); return }
      if (!r.ok) return
      const d = await r.json()
      setRestaurant(d.restaurant.name)
      setOrder(d.order)
      if (last.current && last.current !== d.order.status) {
        const msg = tr(lang, `s_${d.order.status}`)
        setToast(msg); window.setTimeout(() => setToast(''), 6000)
        try { navigator.vibrate?.(200) } catch { /* unsupported */ }
        if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible')
          new Notification(`${d.order.label} · ${d.restaurant.name}`, { body: msg })
      }
      last.current = d.order.status
    } catch { /* offline: next poll retries */ }
  }, [token, lang])

  useEffect(() => {
    void load()
    const poll = window.setInterval(load, 5000) // fallback if the live stream is unavailable
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    let es: EventSource | null = null
    try { es = new EventSource(`/api/orders/${token}/events`); es.addEventListener('status', () => void load()) } catch { /* polling only */ }
    return () => { window.clearInterval(poll); window.clearInterval(tick); es?.close() }
  }, [load, token])

  useEffect(() => {
    if (!order?.verifyToken) { setQr(''); return }
    QRCode.toDataURL(`${location.origin}/staff/verify?t=${order.verifyToken}`, { margin: 1, width: 400, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr(''))
  }, [order?.verifyToken])

  const act = async (path: string, body?: unknown) => {
    await fetch(`/api/orders/${token}/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) })
    await load()
  }

  if (missing) return (
    <main className="ot-page" dir={rtl ? 'rtl' : 'ltr'}><div className="ot-wrap"><div className="ot-card"><h2>404</h2><p>{tr(lang, 'error')}</p><Link className="ot-btn primary" href="/#full-menu">{tr(lang, 'backToMenu')}</Link></div></div></main>
  )
  if (!order) return <main className="ot-page"><div className="ot-wrap"><p className="ox-empty">{tr(lang, 'loading')}</p></div></main>

  const idx = stepState(order.status)
  const failed = order.status === 'rejected' || order.status === 'cancelled'
  const verifyStepFailed = failed
  const at = (to: string) => order.timeline.find((t) => t.to === to)?.at
  const time = (iso?: string | null) => iso ? new Date(iso).toLocaleTimeString(lang === 'EN' ? 'en-GB' : lang === 'AR' ? 'ar-IQ' : 'ckb-IQ', { hour: '2-digit', minute: '2-digit' }) : ''
  const stepTime = [at('awaiting_verification'), at('verified'), at('confirmed'), at('ready'), at('served')]
  const secsLeft = order.verifyExpiresAt ? Math.max(0, Math.floor((new Date(order.verifyExpiresAt).getTime() - now) / 1000)) : 0
  const eta = order.estReadyMinutes && order.confirmedAt && ['confirmed', 'preparing'].includes(order.status)
    ? new Date(new Date(order.confirmedAt).getTime() + order.estReadyMinutes * 60_000) : null
  const good = ['ready', 'served', 'completed'].includes(order.status)

  return (
    <main className="ot-page" dir={rtl ? 'rtl' : 'ltr'}>
      {toast && <div className="ot-toast" role="status">{toast}</div>}
      <header className="ot-top">
        <div className="container">
          <Link href="/#full-menu"><ArrowLeft size={16} className={rtl ? 'rotate-180' : ''} /> {tr(lang, 'backToMenu')}</Link>
          <span className="brand"><span className="brand-mark"><Flame size={17} fill="currentColor" /></span><span>{restaurant.toUpperCase()}</span></span>
        </div>
      </header>

      <div className="ot-wrap">
        <section className="ot-hero">
          <small>{tr(lang, 'orderNumber')}</small>
          <h1>{order.label}</h1>
          <div className="meta">
            <span>{tr(lang, 'table')} <b>{order.tableNumber}</b></span>
            <span><b>{money(order.total, lang)}</b></span>
            <span>{time(order.createdAt)}</span>
          </div>
          <span className={`ot-status ${good ? 'good' : failed ? 'bad' : ''}`}>
            {good ? <Check size={14} /> : failed ? <X size={14} /> : <Clock size={14} />}
            {tr(lang, `s_${order.status}`)}
          </span>
          {order.cancelReason && failed && <p style={{ margin: '12px 0 0', color: '#c9c3bd', fontSize: 13 }}>{tr(lang, 'reason')}: {order.cancelReason}</p>}
          {eta && <p style={{ margin: '12px 0 0', color: '#c9c3bd', fontSize: 13 }}>{tr(lang, 'estimated')}: <b style={{ color: '#fff' }}>~{fmtNum(order.estReadyMinutes!, lang)} {tr(lang, 'min')}</b> ({time(eta.toISOString())})</p>}
        </section>

        {order.status === 'awaiting_verification' && (
          <section className="ot-card ot-verify" aria-live="polite">
            <h2>{tr(lang, 'verifyCode')}</h2>
            {order.verifyExpired || !order.verifyCode ? (
              <>
                <p>{tr(lang, 'codeExpired')}</p>
                <div className="ot-actions" style={{ justifyContent: 'center', marginTop: 12 }}>
                  <button className="ot-btn primary" onClick={() => act('reissue')}>{tr(lang, 'newCode')}</button>
                </div>
              </>
            ) : (
              <>
                <div className="ot-code" dir="ltr">{order.verifyCode}</div>
                {qr && /* eslint-disable-next-line @next/next/no-img-element */ <img className="ot-qr" src={qr} alt="QR" />}
                <p>{tr(lang, 'showWaiter')}</p>
                <p>{tr(lang, 'expiresIn')} <b dir="ltr">{Math.floor(secsLeft / 60)}:{String(secsLeft % 60).padStart(2, '0')}</b></p>
              </>
            )}
          </section>
        )}

        <section className="ot-card">
          <h2>{tr(lang, 'trackOrder')}</h2>
          <ol className="ot-timeline">
            {STEPS.map((s, i) => {
              const state = failed ? (i === 0 ? 'done' : i === 1 && verifyStepFailed && !at('verified') ? 'bad' : i < 2 ? (at('verified') ? 'done' : 'todo') : 'todo') : i < idx ? 'done' : i === idx ? 'now' : 'todo'
              return (
                <li key={s} className={`ot-step ${state}`}>
                  <span className="ot-dot">{state === 'done' ? <Check size={13} strokeWidth={3} /> : state === 'bad' ? <X size={13} strokeWidth={3} /> : state === 'now' ? <i /> : null}</span>
                  <div><b>{tr(lang, `step_${s === 'submitted' ? 'submitted' : s}`)}</b>{stepTime[i] && state !== 'todo' && <small>{time(stepTime[i])}</small>}</div>
                </li>
              )
            })}
          </ol>
        </section>

        <section className="ot-card">
          <h2>{tr(lang, 'yourOrder')}</h2>
          <ul className="ot-items">
            {order.items.map((it, i) => (
              <li key={i}>
                <div>
                  <b>{it.quantity}× {it.name}</b>
                  {it.options.length > 0 && <small>{it.options.map((o) => o.name).join(' · ')}</small>}
                  {it.instructions && <small>“{it.instructions}”</small>}
                </div>
                <span>{money(it.lineTotal, lang)}</span>
              </li>
            ))}
            {order.tax > 0 && <li><span>{tr(lang, 'tax')}</span><span>{money(order.tax, lang)}</span></li>}
            {order.serviceCharge > 0 && <li><span>{tr(lang, 'service')}</span><span>{money(order.serviceCharge, lang)}</span></li>}
            <li><b>{tr(lang, 'total')}</b><b>{money(order.total, lang)}</b></li>
          </ul>
        </section>

        <div className="ot-actions">
          {order.status === 'awaiting_verification' && <button className="ot-btn danger" onClick={() => { if (confirm(tr(lang, 'cancelOrder') + '?')) void act('cancel', { reason: 'Cancelled by customer' }) }}>{tr(lang, 'cancelOrder')}</button>}
          <Link className="ot-btn" href="/#full-menu"><Receipt size={15} /> {tr(lang, 'moreOrder')}</Link>
          {typeof Notification !== 'undefined' && Notification.permission === 'default' && !failed && (
            <button className="ot-btn" onClick={() => void Notification.requestPermission().then(() => setNow(Date.now()))}><Bell size={15} /> {tr(lang, 'notifyMe')}</button>
          )}
        </div>
      </div>
    </main>
  )
}
