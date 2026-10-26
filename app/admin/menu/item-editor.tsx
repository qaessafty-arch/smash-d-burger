'use client'

import { useState } from 'react'
import { Plus, Trash2, Upload, X } from 'lucide-react'
import { api, ApiErr } from '@/components/staff/api'

type LName = { en: string; ku: string; ar: string }
type Opt = { id?: number; name: LName; priceDelta: number; isDefault: boolean; available: boolean }
type Grp = { id?: number; name: LName; kind: 'single' | 'multi'; required: boolean; min: number; max: number; options: Opt[] }
export type EditItem = {
  id: number; categoryId: number; name: LName; desc: LName; price: number; offerPrice: number | null; offerLabel: string; image: string
  prepMinutes: number | null; badge: string; spicy: boolean; featured: boolean; popular: boolean; ingredients: string[]; allergens: string[]
  available: boolean; visible: boolean; groups: Grp[]
}

const blank = (categoryId: number): Omit<EditItem, 'id'> => ({
  categoryId, name: { en: '', ku: '', ar: '' }, desc: { en: '', ku: '', ar: '' }, price: 0, offerPrice: null, offerLabel: '', image: '',
  prepMinutes: null, badge: '', spicy: false, featured: false, popular: false, ingredients: [], allergens: [], available: true, visible: true, groups: [],
})
const split = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

export function ItemEditor({ item, categories, defaultCategory, onClose, onSaved }: {
  item: EditItem | null; categories: Array<{ id: number; name: string }>; defaultCategory: number; onClose: () => void; onSaved: () => void
}) {
  const [f, setF] = useState<Omit<EditItem, 'id'>>(() => (item ? structuredClone(item) : blank(defaultCategory)))
  const [ing, setIng] = useState((item?.ingredients ?? []).join(', '))
  const [alg, setAlg] = useState((item?.allergens ?? []).join(', '))
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))
  const setGroup = (i: number, g: Partial<Grp>) => set('groups', f.groups.map((x, j) => (j === i ? { ...x, ...g } : x)))
  const setOpt = (i: number, k: number, o: Partial<Opt>) => setGroup(i, { options: f.groups[i].options.map((x, j) => (j === k ? { ...x, ...o } : x)) })

  const upload = async (file: File) => {
    const fd = new FormData(); fd.set('file', file)
    const r = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const d = await r.json()
    if (r.ok) set('image', d.url); else setErr(d.error ?? 'Upload failed')
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      const body = { ...f, ingredients: split(ing), allergens: split(alg) }
      if (item) await api('PUT', `/api/admin/items/${item.id}`, body); else await api('POST', '/api/admin/items', body)
      onSaved()
    } catch (x) { setErr(x instanceof ApiErr ? x.message : 'Could not save') } finally { setBusy(false) }
  }

  return (
    <div className="st-drawer-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="st-drawer wide ad-form" onSubmit={save}>
        <header><b className="st-big">{item ? 'Edit item' : 'New item'}</b><button type="button" className="st-icon" onClick={onClose} aria-label="Close"><X size={20} /></button></header>
        <div className="st-drawer-body">
          <div className="ad-grid3">
            <label>Name (English)<input required value={f.name.en} onChange={(e) => set('name', { ...f.name, en: e.target.value })} /></label>
            <label>Name (Kurdish)<input dir="rtl" value={f.name.ku} onChange={(e) => set('name', { ...f.name, ku: e.target.value })} /></label>
            <label>Name (Arabic)<input dir="rtl" value={f.name.ar} onChange={(e) => set('name', { ...f.name, ar: e.target.value })} /></label>
            <label>Description (English)<textarea rows={3} value={f.desc.en} onChange={(e) => set('desc', { ...f.desc, en: e.target.value })} /></label>
            <label>Description (Kurdish)<textarea dir="rtl" rows={3} value={f.desc.ku} onChange={(e) => set('desc', { ...f.desc, ku: e.target.value })} /></label>
            <label>Description (Arabic)<textarea dir="rtl" rows={3} value={f.desc.ar} onChange={(e) => set('desc', { ...f.desc, ar: e.target.value })} /></label>
          </div>
          <div className="ad-grid3">
            <label>Category<select value={f.categoryId} onChange={(e) => set('categoryId', Number(e.target.value))}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label>Price (IQD)<input type="number" min={0} step={100} required value={f.price} onChange={(e) => set('price', Number(e.target.value))} /></label>
            <label>Preparation time (min)<input type="number" min={1} max={240} value={f.prepMinutes ?? ''} onChange={(e) => set('prepMinutes', e.target.value ? Number(e.target.value) : null)} /></label>
            <label>Special offer price (IQD)<input type="number" min={0} step={100} value={f.offerPrice ?? ''} onChange={(e) => set('offerPrice', e.target.value === '' ? null : Number(e.target.value))} placeholder="empty = no offer" /></label>
            <label>Offer label<input value={f.offerLabel} maxLength={40} onChange={(e) => set('offerLabel', e.target.value)} placeholder="e.g. Lunch deal" /></label>
            <label>Badge<input value={f.badge} maxLength={30} onChange={(e) => set('badge', e.target.value)} placeholder="e.g. Bestseller" /></label>
            <label>Ingredients (comma separated)<input value={ing} onChange={(e) => setIng(e.target.value)} /></label>
            <label>Allergens (comma separated)<input value={alg} onChange={(e) => setAlg(e.target.value)} placeholder="gluten, dairy, egg…" /></label>
            <div className="ad-img">
              <span>Photo</span>
              <input value={f.image} onChange={(e) => set('image', e.target.value)} placeholder="https://… or upload" />
              <label className="st-btn sm"><Upload size={14} /> Upload<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} /></label>
              {f.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={f.image} alt="" />}
            </div>
          </div>
          <div className="ad-checks">
            {([['available', 'Available'], ['visible', 'Visible on menu'], ['featured', 'Featured on homepage'], ['popular', 'Mark popular'], ['spicy', 'Spicy']] as const).map(([k, l]) => (
              <label key={k}><input type="checkbox" checked={f[k]} onChange={(e) => set(k, e.target.checked)} /> {l}</label>
            ))}
          </div>

          <h3 className="ad-sub">Customization options</h3>
          <p className="st-muted small">Each item has its own groups, e.g. “Size” (choose one), “Extras” (choose several). Prices are added to the item price.</p>
          {f.groups.map((g, i) => (
            <fieldset key={i} className="ad-group">
              <div className="ad-group-head">
                <input required placeholder="Group name (English)" value={g.name.en} onChange={(e) => setGroup(i, { name: { ...g.name, en: e.target.value } })} />
                <input dir="rtl" placeholder="Kurdish" value={g.name.ku} onChange={(e) => setGroup(i, { name: { ...g.name, ku: e.target.value } })} />
                <input dir="rtl" placeholder="Arabic" value={g.name.ar} onChange={(e) => setGroup(i, { name: { ...g.name, ar: e.target.value } })} />
                <select value={g.kind} onChange={(e) => setGroup(i, { kind: e.target.value as 'single' | 'multi' })}><option value="single">Choose one</option><option value="multi">Choose several</option></select>
                <label><input type="checkbox" checked={g.required} onChange={(e) => setGroup(i, { required: e.target.checked })} /> Required</label>
                {g.kind === 'multi' && <label>Max <input type="number" min={1} max={60} style={{ width: 64 }} value={g.max} onChange={(e) => setGroup(i, { max: Number(e.target.value) })} /></label>}
                <button type="button" className="st-icon dark" aria-label="Remove group" onClick={() => set('groups', f.groups.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
              </div>
              {g.options.map((o, k) => (
                <div key={k} className="ad-opt">
                  <input required placeholder="Option (English)" value={o.name.en} onChange={(e) => setOpt(i, k, { name: { ...o.name, en: e.target.value } })} />
                  <input dir="rtl" placeholder="Kurdish" value={o.name.ku} onChange={(e) => setOpt(i, k, { name: { ...o.name, ku: e.target.value } })} />
                  <input dir="rtl" placeholder="Arabic" value={o.name.ar} onChange={(e) => setOpt(i, k, { name: { ...o.name, ar: e.target.value } })} />
                  <input type="number" step={100} style={{ width: 96 }} value={o.priceDelta} onChange={(e) => setOpt(i, k, { priceDelta: Number(e.target.value) })} aria-label="Extra price" />
                  <label><input type="checkbox" checked={o.isDefault} onChange={(e) => setOpt(i, k, { isDefault: e.target.checked })} /> Default</label>
                  <label><input type="checkbox" checked={o.available} onChange={(e) => setOpt(i, k, { available: e.target.checked })} /> On</label>
                  <button type="button" className="st-icon dark" aria-label="Remove option" onClick={() => setGroup(i, { options: g.options.filter((_, j) => j !== k) })}><Trash2 size={15} /></button>
                </div>
              ))}
              <button type="button" className="st-btn sm" onClick={() => setGroup(i, { options: [...g.options, { name: { en: '', ku: '', ar: '' }, priceDelta: 0, isDefault: false, available: true }] })}><Plus size={14} /> Option</button>
            </fieldset>
          ))}
          <button type="button" className="st-btn" onClick={() => set('groups', [...f.groups, { name: { en: '', ku: '', ar: '' }, kind: 'single', required: false, min: 0, max: 1, options: [{ name: { en: '', ku: '', ar: '' }, priceDelta: 0, isDefault: false, available: true }] }])}><Plus size={14} /> Add option group</button>
          {err && <p className="st-error" role="alert">{err}</p>}
        </div>
        <div className="st-drawer-foot"><button className="st-btn primary lg" disabled={busy}>{busy ? 'Saving…' : 'Save item'}</button><button type="button" className="st-btn lg" onClick={onClose}>Cancel</button></div>
      </form>
    </div>
  )
}
