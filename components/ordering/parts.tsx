'use client'

import { useEffect } from 'react'
import { FALLBACK_FOOD_IMAGE } from '@/lib/utils'

export function FoodImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src || FALLBACK_FOOD_IMAGE}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={(e) => {
        const img = e.currentTarget
        if (!img.dataset.fb) { img.dataset.fb = '1'; img.src = FALLBACK_FOOD_IMAGE }
      }}
    />
  )
}

/** Modal/sheet shell: Escape to close, scroll lock, bottom sheet on phones. */
export function Sheet({ open, onClose, label, children, wide = false }: { open: boolean; onClose: () => void; label: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', key)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = prev }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="ox-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`ox-sheet ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  )
}
