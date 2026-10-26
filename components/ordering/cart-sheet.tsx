'use client'

import { useState } from 'react'
import { AlertTriangle, Minus, Pencil, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { useOrdering } from './provider'
import { money, pick, tr } from './i18n'
import { FoodImage, Sheet } from './parts'
import { TableBanner } from './table-gate'

export function CartSheet() {
  const o = useOrdering()
  const { lang, cart, quote, settings, session } = o
  const [err, setErr] = useState('')
  const hasTable = !!session?.table
  const disabled = !settings?.orderingEnabled
  const canPlace = hasTable && !disabled && !!quote && !o.quoteError && !o.placing && cart.length > 0

  const place = async () => {
    setErr('')
    const e = await o.placeOrder()
    if (e) setErr(e.startsWith('E:') ? (e === 'E:network' ? tr(lang, 'error') : e.slice(2)) : e)
  }

  return (
    <Sheet open={o.cartOpen} onClose={() => o.setCartOpen(false)} label={tr(lang, 'yourOrder')} wide>
      <div className="ox-cart">
        <header className="ox-cart-head">
          <h2><ShoppingBag size={20} /> {tr(lang, 'yourOrder')}</h2>
          <button type="button" className="ox-x light" onClick={() => o.setCartOpen(false)} aria-label={tr(lang, 'close')}><X size={18} /></button>
        </header>
        <div className="ox-cart-body">
          <TableBanner compact />
          {settings?.notice && <p className="ox-warn"><AlertTriangle size={15} /> {settings.notice}</p>}
          {disabled && <p className="ox-warn"><AlertTriangle size={15} /> {tr(lang, 'orderingOff')}</p>}
          {cart.length === 0 ? (
            <p className="ox-empty">{tr(lang, 'cartEmpty')}</p>
          ) : (
            <ul className="ox-lines">
              {cart.map((l, i) => {
                const q = quote?.lines[i]
                const item = o.categories.flatMap((c) => c.items).find((x) => x.id === l.itemId)
                return (
                  <li key={l.key} className="ox-line">
                    <FoodImage src={l.image} alt="" className="ox-line-img" />
                    <div className="ox-line-main">
                      <b>{pick(l.name, lang)}</b>
                      {l.optionNames.length > 0 && <small>{l.optionNames.map((n) => pick(n, lang)).join(' · ')}</small>}
                      {l.instructions && <small className="note">“{l.instructions}”</small>}
                      <div className="ox-line-actions">
                        <div className="ox-stepper sm">
                          <button type="button" onClick={() => o.setQty(l.key, l.quantity - 1)} aria-label="−"><Minus size={14} /></button>
                          <output>{l.quantity}</output>
                          <button type="button" onClick={() => o.setQty(l.key, l.quantity + 1)} aria-label="+"><Plus size={14} /></button>
                        </div>
                        {item && <button type="button" className="ox-link" onClick={() => { o.setCartOpen(false); o.openItem(item, l) }}><Pencil size={12} /> {tr(lang, 'edit')}</button>}
                        <button type="button" className="ox-link danger" onClick={() => o.removeLine(l.key)}><Trash2 size={12} /> {tr(lang, 'remove')}</button>
                      </div>
                    </div>
                    <span className="ox-line-price">{money(q?.lineTotal ?? l.estUnit * l.quantity, lang)}</span>
                  </li>
                )
              })}
            </ul>
          )}
          {o.quoteError && <p className="ox-warn"><AlertTriangle size={15} /> {o.quoteError}</p>}
          {cart.length > 0 && (
            <label className="ox-field">
              <span>{tr(lang, 'noteLabel')}</span>
              <textarea rows={2} maxLength={300} value={o.note} onChange={(e) => o.setNote(e.target.value)} />
            </label>
          )}
        </div>
        {cart.length > 0 && (
          <div className="ox-cart-foot">
            {quote && (
              <dl className="ox-totals">
                <div><dt>{tr(lang, 'subtotal')}</dt><dd>{money(quote.subtotal, lang)}</dd></div>
                {quote.tax > 0 && <div><dt>{tr(lang, 'tax')} ({settings?.taxPercent}%)</dt><dd>{money(quote.tax, lang)}</dd></div>}
                {quote.service > 0 && <div><dt>{tr(lang, 'service')} ({settings?.servicePercent}%)</dt><dd>{money(quote.service, lang)}</dd></div>}
                <div className="grand"><dt>{tr(lang, 'total')}</dt><dd>{money(quote.total, lang)}</dd></div>
              </dl>
            )}
            {err && <p className="ox-err">{err}</p>}
            <button type="button" className="ox-primary wide" disabled={!canPlace} onClick={place}>
              {o.placing ? tr(lang, 'placing') : !hasTable ? tr(lang, 'needTable') : tr(lang, 'placeOrder')}
              {quote && !o.placing && hasTable && <span>{money(quote.total, lang)}</span>}
            </button>
            <button type="button" className="ox-link center" onClick={o.clearCart}>{tr(lang, 'clear')}</button>
          </div>
        )}
      </div>
    </Sheet>
  )
}
