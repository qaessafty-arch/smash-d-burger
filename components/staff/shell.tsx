'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, BellOff, Flame, LogOut } from 'lucide-react'
import { api, ApiErr, type Me, type Role } from './api'

const MeCtx = createContext<{ me: Me; restaurant: string } | null>(null)
export const useMe = () => useContext(MeCtx)!

/** Re-run `fn` on server events and on a timer, so the UI stays correct even if the stream drops. */
export function useLive(fn: () => void, intervalMs = 8000) {
  const ref = useRef(fn)
  useEffect(() => { ref.current = fn })
  useEffect(() => {
    const run = () => ref.current()
    run()
    const iv = window.setInterval(run, intervalMs)
    let es: EventSource | null = null
    let debounce = 0
    try {
      es = new EventSource('/api/staff/events')
      const kick = () => { window.clearTimeout(debounce); debounce = window.setTimeout(run, 250) }
      for (const ev of ['order', 'request', 'notification']) es.addEventListener(ev, kick)
    } catch { /* polling only */ }
    const vis = () => { if (document.visibilityState === 'visible') run() }
    document.addEventListener('visibilitychange', vis)
    return () => { window.clearInterval(iv); es?.close(); document.removeEventListener('visibilitychange', vis) }
  }, [intervalMs])
}

let audio: AudioContext | null = null
function beep() {
  try {
    audio ??= new AudioContext()
    const o = audio.createOscillator(), g = audio.createGain()
    o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.12
    o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + 0.18)
  } catch { /* audio blocked until the user interacts */ }
}

type Toast = { id: number; title: string; body: string; kind: string }

export function StaffShell({ roles, title, children, wide = false }: { roles: Role[]; title: string; children: React.ReactNode; wide?: boolean }) {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [restaurant, setRestaurant] = useState('')
  const [sound, setSound] = useState(true)
  const [alerts, setAlerts] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const lastId = useRef<number | null>(null)

  useEffect(() => {
    api<{ staff: Me | null; restaurantName: string; soundAlerts: boolean }>('GET', '/api/staff/me').then((d) => {
      if (!d.staff) { router.replace(`/staff/login?next=${encodeURIComponent(location.pathname + location.search)}`); return }
      if (!roles.includes(d.staff.role)) { router.replace('/staff'); return }
      setMe(d.staff); setRestaurant(d.restaurantName); setSound(d.soundAlerts)
    }).catch(() => router.replace('/staff/login'))
    setAlerts(typeof Notification !== 'undefined' && Notification.permission === 'granted')
  }, [router, roles])

  const poll = useCallback(async () => {
    if (!me) return
    try {
      const d = await api<{ notifications: Array<{ id: number; kind: string; title: string; body: string }> }>('GET', `/api/staff/notifications?after=${lastId.current ?? 0}`)
      const list = d.notifications
      if (lastId.current === null) { lastId.current = list[0]?.id ?? 0; return } // first load: don't replay history
      const fresh = list.filter((n) => n.id > (lastId.current ?? 0)).reverse()
      if (!fresh.length) return
      lastId.current = list[0].id
      setToasts((t) => [...t, ...fresh.map((n) => ({ id: n.id, title: n.title, body: n.body, kind: n.kind }))].slice(-4))
      if (sound) beep()
      if (alerts && document.visibilityState !== 'visible') fresh.forEach((n) => new Notification(n.title, { body: n.body }))
      window.setTimeout(() => setToasts((t) => t.filter((x) => !fresh.some((f) => f.id === x.id))), 7000)
    } catch (e) {
      if (e instanceof ApiErr && e.status === 401) router.replace('/staff/login')
    }
  }, [me, sound, alerts, router])
  useLive(poll, 6000)

  const logout = async () => { await api('POST', '/api/staff/logout'); router.replace('/staff/login') }
  const enableAlerts = async () => {
    beep()
    if (typeof Notification !== 'undefined') setAlerts((await Notification.requestPermission()) === 'granted')
  }

  if (!me) return <div className="st-boot">Loading…</div>
  return (
    <MeCtx.Provider value={{ me, restaurant }}>
      <div className={`st-app ${wide ? 'wide' : ''}`}>
        <header className="st-top">
          <Link href="/staff" className="st-brand"><span className="brand-mark"><Flame size={16} fill="currentColor" /></span><b>{title}</b></Link>
          <span className="st-who">{me.name} <small>{me.role}</small></span>
          <button type="button" className="st-icon" onClick={enableAlerts} title="Sound and desktop alerts" aria-label="Enable alerts">{alerts || sound ? <Bell size={18} /> : <BellOff size={18} />}</button>
          <button type="button" className="st-icon" onClick={logout} aria-label="Sign out"><LogOut size={18} /></button>
        </header>
        <div className="st-toasts" aria-live="polite">
          {toasts.map((t) => <div key={t.id} className={`st-toast ${t.kind}`}><b>{t.title}</b>{t.body && <span>{t.body}</span>}</div>)}
        </div>
        {children}
      </div>
    </MeCtx.Provider>
  )
}
