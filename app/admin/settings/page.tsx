'use client'

import { useEffect, useState } from 'react'
import { api, ApiErr } from '@/components/staff/api'

type Hours = Array<{ day: string; open: string; close: string; closed: boolean }>
type S = {
  restaurantName: string; tagline: string; description: string; logoUrl: string; coverUrl: string; currency: string; taxPercent: number
  servicePercent: number; timezone: string; hours: Hours; orderingEnabled: boolean; requireVerification: boolean; kitchenNeedsVerified: boolean
  waiterCanSkipKitchen: boolean; manualTableMode: 'open' | 'waiter_only' | 'off'; verifyTtlMinutes: number; tableSessionHours: number
  requestTypes: string[]; soundAlerts: boolean; languages: string[]; whatsapp: string
}
const DAYS: Record<string, string> = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' }
const REQ = ['waiter', 'water', 'utensils', 'napkins', 'bill']

export default function SettingsPage() {
  const [s, setS] = useState<S | null>(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => { api<{ settings: S }>('GET', '/api/admin/settings').then((d) => setS(d.settings)).catch((e) => setErr(e.message)) }, [])
  if (!s) return <p className="st-muted">{err || 'Loading…'}</p>
  const set = <K extends keyof S>(k: K, v: S[K]) => setS({ ...s, [k]: v })

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setMsg('')
    try { const d = await api<{ settings: S }>('PUT', '/api/admin/settings', s); setS(d.settings); setMsg('Saved') } catch (x) { setErr(x instanceof ApiErr ? x.message : 'Could not save') }
  }
  const Toggle = ({ k, label, hint }: { k: 'orderingEnabled' | 'requireVerification' | 'kitchenNeedsVerified' | 'waiterCanSkipKitchen' | 'soundAlerts'; label: string; hint?: string }) => (
    <label className="ad-toggle"><input type="checkbox" checked={s[k]} onChange={(e) => set(k, e.target.checked)} /><span><b>{label}</b>{hint && <small>{hint}</small>}</span></label>
  )

  return (
    <form onSubmit={save} className="ad-settings">
      <div className="ad-head"><h1>Settings</h1><button className="st-btn primary lg">Save changes</button></div>
      {err && <p className="st-error" role="alert">{err}</p>}{msg && <p className="st-ok" role="status">{msg}</p>}

      <section className="ad-panel"><h2>Restaurant</h2>
        <div className="ad-grid3">
          <label>Name<input required value={s.restaurantName} onChange={(e) => set('restaurantName', e.target.value)} /></label>
          <label>Tagline<input value={s.tagline} onChange={(e) => set('tagline', e.target.value)} /></label>
          <label>WhatsApp number<input value={s.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="9647500000000" /></label>
          <label className="span3">Description<textarea rows={2} value={s.description} onChange={(e) => set('description', e.target.value)} /></label>
          <label>Logo URL<input value={s.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} placeholder="/uploads/… (upload in Menu → item)" /></label>
          <label>Cover image URL<input value={s.coverUrl} onChange={(e) => set('coverUrl', e.target.value)} /></label>
          <label>Time zone<input value={s.timezone} onChange={(e) => set('timezone', e.target.value)} /></label>
        </div>
      </section>

      <section className="ad-panel"><h2>Opening hours</h2>
        <div className="ad-hours">
          {s.hours.map((h, i) => (
            <div key={h.day}>
              <b>{DAYS[h.day] ?? h.day}</b>
              <input type="time" value={h.open === '24:00' ? '00:00' : h.open} disabled={h.closed} onChange={(e) => set('hours', s.hours.map((x, j) => (j === i ? { ...x, open: e.target.value } : x)))} />
              <span>to</span>
              <input type="time" value={h.close === '24:00' ? '23:59' : h.close} disabled={h.closed} onChange={(e) => set('hours', s.hours.map((x, j) => (j === i ? { ...x, close: e.target.value } : x)))} />
              <label><input type="checkbox" checked={h.closed} onChange={(e) => set('hours', s.hours.map((x, j) => (j === i ? { ...x, closed: e.target.checked } : x)))} /> Closed</label>
            </div>
          ))}
        </div>
        <p className="st-muted small">Midnight closing: use 23:59, or an earlier time after midnight (e.g. 01:00) to run past midnight.</p>
      </section>

      <section className="ad-panel"><h2>Prices</h2>
        <div className="ad-grid3">
          <label>Currency label<input value={s.currency} maxLength={8} onChange={(e) => set('currency', e.target.value)} /></label>
          <label>Tax (%)<input type="number" min={0} max={50} step={0.5} value={s.taxPercent} onChange={(e) => set('taxPercent', Number(e.target.value))} /></label>
          <label>Service charge (%)<input type="number" min={0} max={50} step={0.5} value={s.servicePercent} onChange={(e) => set('servicePercent', Number(e.target.value))} /></label>
        </div>
      </section>

      <section className="ad-panel"><h2>Ordering & workflow</h2>
        <Toggle k="orderingEnabled" label="Customers can place orders" hint="Turn off to pause ordering (the menu stays visible)." />
        <Toggle k="requireVerification" label="Waiter must verify every order" hint="Off: orders from a scanned table QR go straight to the kitchen. Orders from manually chosen tables are always verified." />
        <Toggle k="kitchenNeedsVerified" label="Kitchen only receives verified orders" hint="Recommended. Keeps unverified orders out of the kitchen." />
        <Toggle k="waiterCanSkipKitchen" label="Waiters can mark orders served without the kitchen" hint="For drinks-only or self-prepared items. Normally off." />
        <div className="ad-grid3">
          <label>Customer picks own table<select value={s.manualTableMode} onChange={(e) => set('manualTableMode', e.target.value as S['manualTableMode'])}>
            <option value="open">Allowed (orders need waiter verification)</option><option value="waiter_only">Only waiter-started sessions</option><option value="off">QR scan only</option></select></label>
          <label>Verification code lifetime (min)<input type="number" min={5} max={720} value={s.verifyTtlMinutes} onChange={(e) => set('verifyTtlMinutes', Number(e.target.value))} /></label>
          <label>Table session length (hours)<input type="number" min={1} max={48} value={s.tableSessionHours} onChange={(e) => set('tableSessionHours', Number(e.target.value))} /></label>
        </div>
      </section>

      <section className="ad-panel"><h2>Customer service & notifications</h2>
        <p className="st-muted small">Request buttons customers can use:</p>
        <div className="ad-checks">{REQ.map((r) => <label key={r}><input type="checkbox" checked={s.requestTypes.includes(r)} onChange={(e) => set('requestTypes', e.target.checked ? [...s.requestTypes, r] : s.requestTypes.filter((x) => x !== r))} /> {r}</label>)}</div>
        <Toggle k="soundAlerts" label="Play a sound for new staff notifications" />
        <p className="st-muted small">Languages offered to customers:</p>
        <div className="ad-checks">{(['EN', 'KU', 'AR'] as const).map((l) => <label key={l}><input type="checkbox" checked={s.languages.includes(l)} onChange={(e) => set('languages', e.target.checked ? [...s.languages, l] : s.languages.filter((x) => x !== l))} /> {l}</label>)}</div>
      </section>
    </form>
  )
}
