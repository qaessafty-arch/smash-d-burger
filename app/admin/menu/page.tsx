'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { api, ApiErr, iqd } from '@/components/staff/api'
import { ItemEditor, type EditItem } from './item-editor'

type LName = { en: string; ku: string; ar: string }
type Cat = { id: number; name: LName; icon: string; visible: boolean; items: Array<EditItem & { unitsSold?: number }> }

const ICONS = ['burger', 'drumstick', 'shrimp', 'fries', 'drink', '']

export default function MenuAdmin() {
  const [cats, setCats] = useState<Cat[]>([])
  const [sel, setSel] = useState<number | null>(null)
  const [edit, setEdit] = useState<EditItem | 'new' | null>(null)
  const [catForm, setCatForm] = useState<{ id?: number; nameEn: string; nameKu: string; nameAr: string; icon: string } | null>(null)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try {
      const d = await api<{ categories: Cat[] }>('GET', '/api/admin/categories')
      setCats(d.categories); setSel((s) => s ?? d.categories[0]?.id ?? null); setErr('')
    } catch (e) { setErr((e as Error).message) }
  }, [])
  useEffect(() => { void load() }, [load])

  const run = async (fn: () => Promise<unknown>) => { try { await fn(); await load(); setErr('') } catch (e) { setErr(e instanceof ApiErr ? e.message : 'Failed') } }
  const cat = cats.find((c) => c.id === sel)
  const move = (i: number, d: number) => {
    const ids = cats.map((c) => c.id); const j = i + d
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    void run(() => api('PATCH', '/api/admin/categories', { id: ids[0], order: ids }))
  }

  return (
    <>
      <div className="ad-head"><h1>Menu</h1></div>
      {err && <p className="st-error" role="alert">{err}</p>}
      <div className="ad-menu">
        <section className="ad-panel">
          <div className="ad-panel-head"><h2>Categories</h2><button className="st-btn sm" onClick={() => setCatForm({ nameEn: '', nameKu: '', nameAr: '', icon: '' })}><Plus size={14} /> Add</button></div>
          <ul className="ad-cats">
            {cats.map((c, i) => (
              <li key={c.id} className={c.id === sel ? 'on' : ''}>
                <button className="name" onClick={() => setSel(c.id)}>{c.name.en} <small>{c.items.length}</small>{!c.visible && <em>hidden</em>}</button>
                <span>
                  <button aria-label="Move up" onClick={() => move(i, -1)}><ArrowUp size={14} /></button>
                  <button aria-label="Move down" onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
                  <button aria-label={c.visible ? 'Hide' : 'Show'} onClick={() => run(() => api('PATCH', '/api/admin/categories', { id: c.id, visible: !c.visible }))}>{c.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                  <button aria-label="Edit" onClick={() => setCatForm({ id: c.id, nameEn: c.name.en, nameKu: c.name.ku, nameAr: c.name.ar, icon: c.icon })}><Pencil size={14} /></button>
                  <button aria-label="Delete" onClick={() => confirm(`Delete category “${c.name.en}”?`) && run(() => api('DELETE', `/api/admin/categories?id=${c.id}`))}><Trash2 size={14} /></button>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="ad-panel">
          <div className="ad-panel-head"><h2>{cat?.name.en ?? 'Items'}</h2>{cat && <button className="st-btn sm primary" onClick={() => setEdit('new')}><Plus size={14} /> Add item</button>}</div>
          {cat && cat.items.length === 0 && <p className="st-muted">No items in this category yet.</p>}
          <ul className="ad-items">
            {cat?.items.map((it) => (
              <li key={it.id} className={!it.visible ? 'dim' : ''}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.image || '/menu-photo.jpg'} alt="" loading="lazy" onError={(e) => { e.currentTarget.src = '/menu-photo.jpg' }} />
                <div className="nm"><b>{it.name.en}</b><small>{it.groups.length} option group{it.groups.length === 1 ? '' : 's'}{it.unitsSold ? ` · ${it.unitsSold} sold` : ''}{it.offerPrice !== null ? ' · offer' : ''}</small></div>
                <label className="price"><input type="number" min={0} step={100} defaultValue={it.price} key={it.price}
                  onBlur={(e) => { const v = Number(e.target.value); if (Number.isInteger(v) && v >= 0 && v !== it.price) void run(() => api('PATCH', `/api/admin/items/${it.id}`, { price: v })) }} aria-label={`Price of ${it.name.en}`} /> <small>IQD</small></label>
                <label className="switch"><input type="checkbox" checked={it.available} onChange={(e) => run(() => api('PATCH', `/api/admin/items/${it.id}`, { available: e.target.checked }))} /><span>{it.available ? 'Available' : 'Sold out'}</span></label>
                <button className="st-icon dark" aria-label="Edit" onClick={() => setEdit(it)}><Pencil size={16} /></button>
                <button className="st-icon dark" aria-label="Delete" onClick={() => confirm(`Delete “${it.name.en}”? Past orders keep their prices.`) && run(() => api('DELETE', `/api/admin/items/${it.id}`))}><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {edit && <ItemEditor item={edit === 'new' ? null : edit} categories={cats.map((c) => ({ id: c.id, name: c.name.en }))} defaultCategory={sel ?? cats[0]?.id ?? 0} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void load() }} />}

      {catForm && (
        <div className="st-drawer-wrap center" onMouseDown={(e) => e.target === e.currentTarget && setCatForm(null)}>
          <form className="st-modal form" onSubmit={(e) => { e.preventDefault(); void run(async () => { await api(catForm.id ? 'PATCH' : 'POST', '/api/admin/categories', catForm); setCatForm(null) }) }}>
            <h3>{catForm.id ? 'Edit category' : 'New category'}</h3>
            <label>Name (English)<input required value={catForm.nameEn} onChange={(e) => setCatForm({ ...catForm, nameEn: e.target.value })} /></label>
            <label>Name (Kurdish)<input dir="rtl" value={catForm.nameKu} onChange={(e) => setCatForm({ ...catForm, nameKu: e.target.value })} /></label>
            <label>Name (Arabic)<input dir="rtl" value={catForm.nameAr} onChange={(e) => setCatForm({ ...catForm, nameAr: e.target.value })} /></label>
            <label>Icon<select value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}>{ICONS.map((i) => <option key={i} value={i}>{i || 'Default'}</option>)}</select></label>
            <div className="st-actions"><button className="st-btn primary">Save</button><button type="button" className="st-btn" onClick={() => setCatForm(null)}>Cancel</button></div>
          </form>
        </div>
      )}
    </>
  )
}
