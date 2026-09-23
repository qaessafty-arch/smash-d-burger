'use client'

import React, { useState } from 'react'
import { X, Star, Flame, Check } from 'lucide-react'

export interface ReviewItem {
  id: string
  name: string
  stars: number
  comment: string
  date: string
  favoriteItem?: string
}

interface ReviewModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmitReview: (review: ReviewItem) => void
  lang?: 'EN' | 'KU' | 'AR'
}

export function ReviewModal({
  isOpen,
  onClose,
  onSubmitReview,
  lang = 'EN',
}: ReviewModalProps) {
  const [name, setName] = useState('')
  const [stars, setStars] = useState(5)
  const [hoverStars, setHoverStars] = useState(0)
  const [comment, setComment] = useState('')
  const [favoriteItem, setFavoriteItem] = useState('Classic Smash')
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen) return null

  const popularItems = [
    'Classic Smash',
    'Double Cheese Smash',
    'Spicy Erbil Smash',
    'Chicken Smash',
    'Loaded Fries',
    'Vanilla Milkshake',
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !comment.trim()) return

    const newReview: ReviewItem = {
      id: `rev-${Date.now()}`,
      name: name.trim(),
      stars,
      comment: comment.trim(),
      date: 'Just now',
      favoriteItem,
    }

    onSubmitReview(newReview)
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setName('')
      setComment('')
      setStars(5)
      onClose()
    }, 1200)
  }

  const isRtl = lang !== 'EN'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#171717] text-white rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#1f1b18]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#D95B32] text-[#171717] flex items-center justify-center font-bold">
              <Flame size={18} fill="currentColor" />
            </span>
            <div>
              <h3 className="text-xl font-normal uppercase font-[family-name:var(--font-anton,Anton)] leading-none">
                {lang === 'KU'
                  ? 'هەڵسەنگاندنی خۆت بنووسە'
                  : lang === 'AR'
                  ? 'أضف تقييمك'
                  : 'Leave a Review'}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {lang === 'KU'
                  ? 'ئەزموونی بەرگەرەکەت لەگەڵ خەڵکی هەولێر بەش بکە'
                  : lang === 'AR'
                  ? 'شارك تجربتك مع برجر سماش في أربيل'
                  : 'Share your honest smash experience in Erbil'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
            aria-label="Close review modal"
          >
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="p-10 text-center flex flex-col items-center justify-center space-y-3">
            <span className="w-14 h-14 rounded-full bg-[#49675F] text-white flex items-center justify-center mb-2 animate-bounce">
              <Check size={28} />
            </span>
            <h4 className="text-2xl font-normal uppercase font-[family-name:var(--font-anton,Anton)] text-[#D9AA55]">
              {lang === 'KU' ? 'سوپاس بۆ هەڵسەنگاندنەکەت!' : lang === 'AR' ? 'شكراً لتقييمك!' : 'Thank you for your review!'}
            </h4>
            <p className="text-sm text-neutral-300">
              {lang === 'KU' ? 'ڕای تۆ بۆ ئێمە زۆر گرنگە.' : lang === 'AR' ? 'رأيك يسعدنا ويدعمنا دائماً.' : 'Your feedback keeps the smash grill sizzling.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
            {/* Star selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                {lang === 'KU' ? 'نمرەی ئەستێرە' : lang === 'AR' ? 'التقييم بالنجوم' : 'Your Rating'}
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((idx) => {
                  const active = (hoverStars || stars) >= idx
                  return (
                    <button
                      key={idx}
                      type="button"
                      onMouseEnter={() => setHoverStars(idx)}
                      onMouseLeave={() => setHoverStars(0)}
                      onClick={() => setStars(idx)}
                      className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none"
                      aria-label={`Rate ${idx} stars`}
                    >
                      <Star
                        size={28}
                        className={active ? 'fill-[#D9AA55] text-[#D9AA55]' : 'text-neutral-600'}
                      />
                    </button>
                  )
                })}
                <span className="ml-3 text-xs font-bold text-[#D9AA55]">
                  {stars === 5 ? '5/5 - Perfect!' : `${stars}/5`}
                </span>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                {lang === 'KU' ? 'ناوەکەت' : lang === 'AR' ? 'الاسم' : 'Your Name'} *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={lang === 'KU' ? 'بۆ نموونە: دیلان ک.' : lang === 'AR' ? 'مثال: سارة م.' : 'e.g. Alan K. or Sara M.'}
                className="w-full px-3.5 py-2.5 rounded-[4px] bg-[#101010] border border-white/15 text-white placeholder-neutral-500 focus:outline-none focus:border-[#D95B32]"
              />
            </div>

            {/* Favorite Item */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                {lang === 'KU' ? 'خواردنی دڵخوازت' : lang === 'AR' ? 'وجبتك المفضلة' : 'Favorite Item'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {popularItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFavoriteItem(item)}
                    className={`px-2.5 py-1 text-xs rounded-[4px] border font-medium transition-all ${
                      favoriteItem === item
                        ? 'bg-[#D95B32] text-[#171717] font-bold border-[#D95B32]'
                        : 'bg-white/5 text-neutral-400 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                {lang === 'KU' ? 'ڕا و سەرنجت' : lang === 'AR' ? 'رأيك وتجربتك' : 'Your Review'} *
              </label>
              <textarea
                required
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  lang === 'KU'
                    ? 'باسی چێژ و لێواری کڕیسپی و گەرمی گەیاندن بکە...'
                    : lang === 'AR'
                    ? 'أخبرنا عن طعم البرجر والقرمشة وسرعة التوصيل...'
                    : 'Tell us about the crispy edges, juicy beef, bun, and sauces...'
                }
                className="w-full px-3.5 py-2.5 rounded-[4px] bg-[#101010] border border-white/15 text-white placeholder-neutral-500 focus:outline-none focus:border-[#D95B32] resize-none"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-[4px] bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-bold uppercase tracking-[0.5px] transition-all hover:-translate-y-0.5"
              >
                {lang === 'KU' ? 'پاشگەزبوونەوە' : lang === 'AR' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-[4px] bg-[#D95B32] hover:bg-[#e36a43] text-[#171717] font-bold text-xs uppercase tracking-[0.5px] transition-all hover:-translate-y-0.5"
              >
                {lang === 'KU' ? 'ناردنی هەڵسەنگاندن' : lang === 'AR' ? 'إرسال التقييم' : 'Submit Review'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
