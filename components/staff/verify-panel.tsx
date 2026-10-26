'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { Camera, CheckCircle2, ScanLine, X } from 'lucide-react'
import { api, ApiErr, iqd, type OrderFull } from './api'

type Preview = Pick<OrderFull, 'id' | 'label' | 'tableNumber' | 'total' | 'items' | 'customerNote'>

/** Waiter verification: look up by 6-digit code or scanned QR, review the order, then verify and send to the kitchen. */
export function VerifyPanel({ initialToken, onDone }: { initialToken?: string; onDone: () => void }) {
  const [code, setCode] = useState('')
  const [cred, setCred] = useState<{ code?: string; token?: string } | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [verified, setVerified] = useState<OrderFull | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [scanning, setScanning] = useState(false)

  const lookup = useCallback(async (c: { code?: string; token?: string }) => {
    setBusy(true); setErr(''); setPreview(null)
    try {
      const d = await api<{ order: Preview }>('POST', '/api/staff/verify', c)
      setCred(c); setPreview(d.order)
    } catch (e) { setErr(e instanceof ApiErr ? e.message : 'Lookup failed'); setCred(null) } finally { setBusy(false) }
  }, [])

  useEffect(() => { if (initialToken) void lookup({ token: initialToken }) }, [initialToken, lookup])

  const verify = async () => {
    if (!preview || !cred) return
    setBusy(true); setErr('')
    try {
      const d = await api<{ order: OrderFull }>('POST', `/api/staff/orders/${preview.id}/verify`, cred)
      setVerified(d.order); setPreview(null); onDone()
    } catch (e) { setErr(e instanceof ApiErr ? e.message : 'Verification failed') } finally { setBusy(false) }
  }
  const confirm = async () => {
    if (!verified) return
    setBusy(true); setErr('')
    try {
      await api('POST', `/api/staff/orders/${verified.id}/transition`, { to: 'confirmed' })
      setVerified(null); setCode(''); setCred(null); onDone()
    } catch (e) { setErr(e instanceof ApiErr ? e.message : 'Could not send to kitchen') } finally { setBusy(false) }
  }
  const reset = () => { setPreview(null); setVerified(null); setCred(null); setCode(''); setErr('') }

  if (verified) {
    return (
      <div className="st-verified">
        <CheckCircle2 size={56} />
        <h2>ORDER VERIFIED</h2>
        <p className="st-table-tag lg">Table <b>{verified.tableNumber}</b></p>
        <p>Order <b>{verified.label}</b> · Total <b>{iqd(verified.total)}</b></p>
        {err && <p className="st-error">{err}</p>}
        <div className="st-actions center">
          <button className="st-btn primary lg" onClick={confirm} disabled={busy}>Confirm & send to kitchen</button>
          <button className="st-btn" onClick={reset}>Verify another</button>
        </div>
      </div>
    )
  }

  return (
    <div className="st-verify">
      {!preview && (
        <>
          <form onSubmit={(e) => { e.preventDefault(); if (/^\d{6}$/.test(code)) void lookup({ code }) }}>
            <label className="st-label">Customer's 6-digit code</label>
            <input className="st-codein" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} placeholder="000000" dir="ltr"
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
            <div className="st-actions center">
              <button className="st-btn primary lg" disabled={busy || code.length !== 6}>Find order</button>
              <button type="button" className="st-btn lg" onClick={() => setScanning(true)}><Camera size={18} /> Scan QR</button>
            </div>
          </form>
          {err && <p className="st-error big" role="alert">{err}</p>}
          {scanning && <Scanner onClose={() => setScanning(false)} onToken={(t) => { setScanning(false); void lookup({ token: t }) }} />}
        </>
      )}
      {preview && (
        <div className="st-preview">
          <p className="st-label">Check this is the right table, then verify</p>
          <div className="st-preview-head"><span className="st-table-tag lg">Table <b>{preview.tableNumber}</b></span><b>{preview.label}</b><span>{iqd(preview.total)}</span></div>
          <ul className="st-items">
            {preview.items.map((it, i) => (
              <li key={i}><b>{it.quantity}× {it.name}</b><span>{iqd(it.lineTotal)}</span>
                {it.options.length > 0 && <small>{it.options.map((x) => x.name).join(' · ')}</small>}
                {it.instructions && <em>“{it.instructions}”</em>}</li>
            ))}
          </ul>
          {preview.customerNote && <p className="st-callout">{preview.customerNote}</p>}
          {err && <p className="st-error" role="alert">{err}</p>}
          <div className="st-actions center">
            <button className="st-btn primary lg" onClick={verify} disabled={busy}>Verify this order</button>
            <button className="st-btn" onClick={reset}>Not this one</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Scanner({ onToken, onClose }: { onToken: (t: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [msg, setMsg] = useState('Starting camera…')
  useEffect(() => {
    let stop = false
    let stream: MediaStream | null = null
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        const v = video.current!
        v.srcObject = stream
        await v.play()
        setMsg('Point the camera at the customer’s QR code')
        const tick = () => {
          if (stop) return
          if (v.videoWidth) {
            canvas.width = v.videoWidth; canvas.height = v.videoHeight
            ctx.drawImage(v, 0, 0)
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const hit = jsQR(img.data, img.width, img.height)
            if (hit?.data) {
              // Only accept our own verification links; never act on arbitrary QR content.
              try {
                const u = new URL(hit.data)
                const t = u.pathname === '/staff/verify' ? u.searchParams.get('t') : null
                if (t && u.origin === location.origin) { onToken(t); return }
                setMsg('That QR code is not an order code for this restaurant')
              } catch { setMsg('That QR code is not an order code for this restaurant') }
            }
          }
          requestAnimationFrame(tick)
        }
        tick()
      } catch { setMsg('Camera unavailable. Allow camera access, or type the 6-digit code instead.') }
    })()
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()) }
  }, [onToken])
  return (
    <div className="st-scan">
      <video ref={video} playsInline muted />
      <div className="st-scan-frame"><ScanLine size={36} /></div>
      <p>{msg}</p>
      <button type="button" className="st-btn" onClick={onClose}><X size={16} /> Close</button>
    </div>
  )
}
