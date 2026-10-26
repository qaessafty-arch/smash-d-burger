'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Clock, Flame, Minus, Plus, X } from 'lucide-react'
import { useOrdering } from './provider'
import { money, pick, tr } from './i18n'
import { FoodImage, Sheet } from './parts'
import { STATIC_SITE } from '@/lib/utils'
import type { Group, MenuItem } from './types'

function defaults(item: MenuItem): Record<number, number[]> {
  const out: Record<number, number[]> = {}
  for (const g of item.groups) out[g.id] = g.options.filter((o) => o.isDefault && o.available).map((o) => o.id)
  return out
}

export function ItemSheet() {
  const { itemView, closeItem, lang, addLine, settings } = useOrdering()
  const item = itemView?.item
  const editing = itemView?.line
  const [sel, setSel] = useState<Record<number, number[]>>({})
  const [qty, setQty] = useState(1)
  const [instr, setInstr] = useState('')

  useEffect(() => {
    if (!item) return
    if (editing) {
      const ids = new Set(editing.optionIds)
      const s: Record<number, number[]> = {}
      for (const g of item.groups) s[g.id] = g.options.filter((o) => ids.has(o.id)).map((o) => o.id)
      setSel(s); setQty(editing.quantity); setInstr(editing.instructions)
    } else { setSel(defaults(item)); setQty(1); setInstr('') }
  }, [item, editing])

  const flat = useMemo(() => (item ? item.groups.flatMap((g) => g.options) : []), [item])
  if (!item) return <Sheet open={false} onClose={closeItem} label="" children={null} />

  const optionIds = Object.values(sel).flat()
  const extras = optionIds.reduce((s, id) => s + (flat.find((o) => o.id === id)?.priceDelta ?? 0), 0)
  const unit = (item.offerPrice ?? item.price) + extras
  const missing = item.groups.filter((g) => g.required && (sel[g.id]?.length ?? 0) < Math.max(1, g.min))

  const toggle = (g: Group, id: number) =>
    setSel((s) => {
      const cur = s[g.id] ?? []
      if (g.kind === 'single') return { ...s, [g.id]: cur[0] === id && !g.required ? [] : [id] }
      if (cur.includes(id)) return { ...s, [g.id]: cur.filter((x) => x !== id) }
      if (cur.length >= g.max) return s
      return { ...s, [g.id]: [...cur, id] }
    })

  const submit = () => {
    if (missing.length || !item.available) return
    addLine({
      itemId: item.id, quantity: qty, optionIds, instructions: instr.trim(),
      name: item.name, optionNames: optionIds.map((id) => flat.find((o) => o.id === id)!.name), estUnit: unit, image: item.image,
    }, editing?.key)
    closeItem()
  }

  return (
    <Sheet open onClose={closeItem} label={pick(item.name, lang)}>
      <div className="ox-item">
        <div className="ox-item-media">
          <FoodImage src={item.image} alt={pick(item.name, lang)} />
          <button type="button" className="ox-x" onClick={closeItem} aria-label={tr(lang, 'close')}><X size={18} /></button>
        </div>
        <div className="ox-item-body">
          <div className="ox-chips">
            {item.spicy && <span className="ox-chip hot"><Flame size={11} /> SPICY</span>}
            {item.badge && !/spicy/i.test(item.badge) && <span className="ox-chip">{item.badge}</span>}
            {item.offerPrice !== null && <span className="ox-chip offer">{item.offerLabel || tr(lang, 'offers')}</span>}
            {item.prepMinutes && <span className="ox-meta"><Clock size={13} /> {item.prepMinutes} {tr(lang, 'min')}</span>}
          </div>
          <h2 className="ox-item-title">{pick(item.name, lang)}</h2>
          <p className="ox-item-desc">{pick(item.desc, lang)}</p>
          <div className="ox-item-price">
            {item.offerPrice !== null && <s>{money(item.price, lang)}</s>}
            <b>{money(item.offerPrice ?? item.price, lang)}</b>
          </div>

          {(item.ingredients.length > 0 || item.allergens.length > 0) && (
            <dl className="ox-facts">
              {item.ingredients.length > 0 && (<><dt>{tr(lang, 'ingredients')}</dt><dd>{item.ingredients.join(' · ')}</dd></>)}
              {item.allergens.length > 0 && (<><dt>{tr(lang, 'allergens')}</dt><dd className="warn">{item.allergens.join(' · ')}</dd></>)}
            </dl>
          )}

          {item.groups.map((g) => (
            <fieldset key={g.id} className="ox-group">
              <legend>
                {pick(g.name, lang)}
                <small>{g.required ? tr(lang, 'required') : g.kind === 'multi' ? `${tr(lang, 'chooseUpTo')} ${g.max}` : tr(lang, 'optional')}</small>
              </legend>
              {g.options.filter((o) => o.available).map((o) => {
                const on = (sel[g.id] ?? []).includes(o.id)
                return (
                  <button key={o.id} type="button" role={g.kind === 'single' ? 'radio' : 'checkbox'} aria-checked={on} className={`ox-opt ${on ? 'on' : ''}`} onClick={() => toggle(g, o.id)}>
                    <span className={`ox-tick ${g.kind}`}>{on && <Check size={12} strokeWidth={3} />}</span>
                    <span className="ox-opt-name">{pick(o.name, lang)}</span>
                    {o.priceDelta !== 0 && <span className="ox-opt-price">{o.priceDelta > 0 ? '+' : ''}{money(o.priceDelta, lang)}</span>}
                  </button>
                )
              })}
            </fieldset>
          ))}

          <label className="ox-field">
            <span>{tr(lang, 'instructions')}</span>
            <textarea value={instr} maxLength={200} rows={2} onChange={(e) => setInstr(e.target.value)} placeholder={tr(lang, 'instrPlaceholder')} />
          </label>
        </div>
        <div className="ox-item-bar">
          <div className="ox-stepper" aria-label={tr(lang, 'quantity')}>
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="−"><Minus size={16} /></button>
            <output>{qty}</output>
            <button type="button" onClick={() => setQty((q) => Math.min(50, q + 1))} aria-label="+"><Plus size={16} /></button>
          </div>
          <button type="button" className="ox-primary" disabled={!item.available || missing.length > 0 || !settings?.orderingEnabled} onClick={submit}>
            {!item.available ? tr(lang, 'unavailable') : !settings?.orderingEnabled ? tr(lang, STATIC_SITE ? 'needTable' : 'orderingPaused') : editing ? tr(lang, 'update') : tr(lang, 'addToOrder')}
            <span>{money(unit * qty, lang)}</span>
          </button>
        </div>
      </div>
    </Sheet>
  )
}
