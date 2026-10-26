'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Clock, Flame, Plus, Search, ShoppingBag, Star } from 'lucide-react'
import { categoryIcon } from '@/components/category-icons'
import { useOrdering } from './provider'
import { money, pick, tr } from './i18n'
import { FoodImage } from './parts'
import { TableBanner } from './table-gate'
import type { MenuItem } from './types'

export function ItemCard({ item }: { item: MenuItem }) {
  const { lang, openItem } = useOrdering()
  return (
    <button type="button" className={`ox-card ${item.available ? '' : 'off'}`} onClick={() => openItem(item)}>
      <span className="ox-card-img">
        <FoodImage src={item.image} alt={pick(item.name, lang)} />
        <span className="ox-card-badges">
          {item.offerPrice !== null && <em className="offer">{item.offerLabel || tr(lang, 'offers')}</em>}
          {item.badge && !/spicy/i.test(item.badge) && <em>{item.badge}</em>}
        </span>
        {!item.available && <span className="ox-card-off">{tr(lang, 'unavailable')}</span>}
      </span>
      <span className="ox-card-info">
        <span className="ox-card-title">
          <b>{pick(item.name, lang)}</b>
          {item.spicy && <Flame size={14} className="hot" aria-label="spicy" />}
          {item.popular && <Star size={13} fill="currentColor" className="pop" aria-label={tr(lang, 'popular')} />}
        </span>
        <span className="ox-card-desc">{pick(item.desc, lang)}</span>
        <span className="ox-card-foot">
          <span className="ox-price">
            {item.offerPrice !== null && <s>{money(item.price, lang)}</s>}
            <b>{money(item.offerPrice ?? item.price, lang)}</b>
          </span>
          {item.prepMinutes && <span className="ox-meta"><Clock size={12} /> {item.prepMinutes} {tr(lang, 'min')}</span>}
          <span className="ox-add" aria-hidden="true"><Plus size={17} /></span>
        </span>
      </span>
    </button>
  )
}

export function FeaturedSection({ eyebrow, title, link }: { eyebrow: string; title: React.ReactNode; link: React.ReactNode }) {
  const { categories, loading, loadError, reload, lang } = useOrdering()
  const items = categories.flatMap((c) => c.items).filter((i) => i.featured && i.available).slice(0, 4)
  return (
    <section id="menu" className="menu-backdrop">
      <div className="container section">
        <div className="section-head">
          <div><p className="eyebrow dark">{eyebrow}</p><h2>{title}</h2></div>
          {link}
        </div>
        {loadError && !items.length ? (
          <p className="ox-empty">{tr(lang, 'error')} <button type="button" className="ox-link" onClick={reload}>{tr(lang, 'retry')}</button></p>
        ) : loading ? (
          <div className="featured-grid">{[0, 1, 2, 3].map((i) => <div key={i} className="ox-card skeleton" />)}</div>
        ) : (
          <div className="featured-grid">{items.map((i) => <ItemCard key={i.id} item={i} />)}</div>
        )}
      </div>
    </section>
  )
}

type Filter = 'all' | 'popular' | 'offers'

export function FullMenu({ eyebrow, title }: { eyebrow: string; title: React.ReactNode }) {
  const { categories, settings, lang, loading, loadError, reload } = useOrdering()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [active, setActive] = useState<number | null>(null)
  const navRef = useRef<HTMLDivElement>(null)

  const all = useMemo(() => categories.flatMap((c) => c.items), [categories])
  const hasPopular = all.some((i) => i.popular)
  const hasOffers = all.some((i) => i.offerPrice !== null)
  const query = q.trim().toLowerCase()
  const results = useMemo(() => {
    if (query) return all.filter((i) => [i.name.en, i.name.ar, i.name.ku, i.desc.en, i.desc.ar, i.desc.ku, ...i.ingredients].join(' ').toLowerCase().includes(query))
    if (filter === 'popular') return all.filter((i) => i.popular)
    if (filter === 'offers') return all.filter((i) => i.offerPrice !== null)
    return null
  }, [all, query, filter])

  useEffect(() => {
    if (results) return
    const els = categories.map((c) => document.getElementById(`cat-${c.id}`)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (vis) setActive(Number(vis.target.id.replace('cat-', '')))
    }, { rootMargin: '-120px 0px -60% 0px' })
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [categories, results])

  useEffect(() => {
    // keep the active chip in view in the horizontal nav
    const el = navRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [active])

  const open = settings?.isOpen

  return (
    <section id="full-menu" className="menu-section full-menu">
      <div className="container section ox-menu">
        <div className="section-head">
          <div><p className="eyebrow dark">{eyebrow}</p><h2>{title}</h2></div>
          <div className="ox-status">
            {settings && <span className={`ox-open ${open ? 'on' : ''}`}><i />{open ? tr(lang, 'openNow') : tr(lang, 'closedNow')}</span>}
            <p>{tr(lang, 'orderFromTable')}</p>
          </div>
        </div>

        <TableBanner />

        <div className="ox-search">
          <Search size={17} />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr(lang, 'search')} aria-label={tr(lang, 'search')} />
        </div>

        <div className="ox-cats" ref={navRef} role="tablist">
          <button type="button" role="tab" aria-selected={!query && filter === 'all' && active === null} data-active={!query && filter === 'all' && active === null} className="ox-cat" onClick={() => { setQ(''); setFilter('all'); setActive(null); window.scrollTo({ top: (document.getElementById('full-menu')?.offsetTop ?? 0), behavior: 'smooth' }) }}>{tr(lang, 'all')}</button>
          {hasPopular && <button type="button" role="tab" aria-selected={filter === 'popular'} data-active={filter === 'popular'} className="ox-cat" onClick={() => { setQ(''); setFilter('popular') }}><Star size={14} /> {tr(lang, 'popular')}</button>}
          {hasOffers && <button type="button" role="tab" aria-selected={filter === 'offers'} data-active={filter === 'offers'} className="ox-cat" onClick={() => { setQ(''); setFilter('offers') }}>{tr(lang, 'offers')}</button>}
          {categories.map((c) => {
            const Icon = categoryIcon(c.icon)
            const on = !results && active === c.id
            return (
              <button key={c.id} type="button" role="tab" aria-selected={on} data-active={on} className="ox-cat" onClick={() => {
                setQ(''); setFilter('all'); setActive(c.id)
                setTimeout(() => document.getElementById(`cat-${c.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
              }}>
                <Icon size={15} /> {pick(c.name, lang)}
              </button>
            )
          })}
        </div>

        {loadError && !categories.length ? (
          <p className="ox-empty">{tr(lang, 'error')} <button type="button" className="ox-link" onClick={reload}>{tr(lang, 'retry')}</button></p>
        ) : loading ? (
          <div className="ox-grid">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="ox-card skeleton" />)}</div>
        ) : results ? (
          results.length ? <div className="ox-grid">{results.map((i) => <ItemCard key={i.id} item={i} />)}</div> : <p className="ox-empty">{tr(lang, 'noResults')}</p>
        ) : (
          categories.filter((c) => c.items.length).map((c) => (
            <div key={c.id} id={`cat-${c.id}`} className="ox-cat-block">
              <h3>{pick(c.name, lang)} <small>{c.items.length}</small></h3>
              <div className="ox-grid">{c.items.map((i) => <ItemCard key={i.id} item={i} />)}</div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export function CartBar() {
  const { cartCount, quote, cart, lang, setCartOpen, cartOpen, itemView } = useOrdering()
  if (!cartCount || cartOpen || itemView) return null
  const total = quote?.total ?? cart.reduce((s, l) => s + l.estUnit * l.quantity, 0)
  return (
    <button type="button" className="ox-cartbar" onClick={() => setCartOpen(true)}>
      <span className="count"><ShoppingBag size={18} /><i>{cartCount}</i></span>
      <b>{tr(lang, 'yourOrder')}</b>
      <span>{money(total, lang)}</span>
    </button>
  )
}
