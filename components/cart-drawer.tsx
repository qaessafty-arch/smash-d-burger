'use client'

import React, { useState } from 'react'
import {
  X,
  Trash2,
  Plus,
  Minus,
  MessageCircle,
  ArrowRight,
  Flame,
  Check,
  Copy,
  MapPin,
  ShoppingBag,
} from 'lucide-react'
import { CustomizedBurgerOrder } from './burger-customizer-modal'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
  items: CustomizedBurgerOrder[]
  onUpdateQuantity: (id: string, newQty: number) => void
  onRemoveItem: (id: string) => void
  onClearCart: () => void
  lang?: 'EN' | 'KU' | 'AR'
}

function formatPrice(num: number): string {
  return num.toLocaleString('en-US')
}

export function CartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  lang = 'EN',
}: CartDrawerProps) {
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery')
  const [customerName, setCustomerName] = useState('')
  const [address, setAddress] = useState('')
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const isRtl = lang !== 'EN'
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const itemsSubtotal = items.reduce((sum, item) => sum + item.totalPrice, 0)
  const deliveryFee = orderType === 'delivery' && items.length > 0 ? 2000 : 0
  const grandTotal = itemsSubtotal + deliveryFee

  // Build formatted text representation of order
  const buildOrderSummaryText = () => {
    if (items.length === 0) return 'Tray is empty'

    const lines: string[] = [
      '🔥 *NEW SMASHED BURGER ORDER (ERBIL)* 🔥',
      '----------------------------------------',
      `Type: ${orderType === 'delivery' ? '🛵 Delivery in Erbil' : '🛍️ Store Pickup (Gulan St)'}`,
    ]

    if (customerName.trim()) {
      lines.push(`Customer: ${customerName.trim()}`)
    }
    if (orderType === 'delivery' && address.trim()) {
      lines.push(`Address / Area: ${address.trim()}`)
    }
    lines.push('----------------------------------------')
    lines.push('*Items Ordered:*')

    items.forEach((item, index) => {
      lines.push(`${index + 1}. *${item.quantity}x ${item.burgerName}* (${formatPrice(item.totalPrice)} IQD)`)
      if (item.removedIngredients && item.removedIngredients.length > 0) {
        lines.push(`   • Without: ${item.removedIngredients.join(', ')}`)
      }
      if (item.addedExtras && item.addedExtras.length > 0) {
        lines.push(`   • Extras: ${item.addedExtras.map((e) => e.name).join(', ')}`)
      }
      if (item.sauceLevel && item.sauceLevel !== 'Normal' && item.sauceLevel !== 'Standard') {
        lines.push(`   • Sauce Level: ${item.sauceLevel}`)
      }
      if (item.specialInstructions) {
        lines.push(`   • Note: "${item.specialInstructions}"`)
      }
    })

    lines.push('----------------------------------------')
    lines.push(`Subtotal: ${formatPrice(itemsSubtotal)} IQD`)
    if (deliveryFee > 0) {
      lines.push(`Delivery Fee: ${formatPrice(deliveryFee)} IQD`)
    }
    lines.push(`💰 *Grand Total: ${formatPrice(grandTotal)} IQD*`)

    return lines.join('\n')
  }

  const buildWhatsAppUrl = () => {
    if (items.length === 0) {
      return 'https://wa.me/9647500000000?text=Hi%20Smashed%20Burger%2C%20I%27d%20like%20to%20order.'
    }
    const message = buildOrderSummaryText()
    return `https://wa.me/9647500000000?text=${encodeURIComponent(message)}`
  }

  const handleCopyOrder = () => {
    const text = buildOrderSummaryText()
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-[#171717] text-white flex flex-col border-l border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#1f1b18]">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#D95B32] text-[#171717] flex items-center justify-center font-bold">
              <Flame size={18} fill="currentColor" />
            </span>
            <div>
              <h2
                id="cart-drawer-title"
                className="text-xl font-normal uppercase font-[family-name:var(--font-anton,Anton)] leading-tight"
              >
                {lang === 'KU' ? 'سەبەتەی داواکاری' : lang === 'AR' ? 'سلة الطلبات' : 'Your Order'}
              </h2>
              <span className="text-xs text-neutral-400">
                {totalCount}{' '}
                {lang === 'KU'
                  ? 'بڕگەی هەڵبژێردراو'
                  : lang === 'AR'
                  ? 'وجبة في السلة'
                  : `item${totalCount !== 1 ? 's' : ''} in cart`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className="text-xs text-neutral-400 hover:text-red-400 px-2 py-1 rounded transition-colors"
                title="Clear all items"
              >
                {lang === 'KU' ? 'سڕینەوە' : lang === 'AR' ? 'إفراغ' : 'Clear'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close cart"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Order Fulfillment Selector */}
        {items.length > 0 && (
          <div className="p-3 bg-neutral-900 border-b border-white/10 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setOrderType('delivery')}
                className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-1.5 font-bold transition-all ${
                  orderType === 'delivery'
                    ? 'border-[#D95B32] bg-[#D95B32]/15 text-white'
                    : 'border-white/10 text-neutral-400 hover:text-white'
                }`}
              >
                <span>🛵 {lang === 'KU' ? 'گەیاندن (+٢,٠٠٠)' : lang === 'AR' ? 'توصيل (+2,000)' : 'Erbil Delivery (+2,000)'}</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderType('pickup')}
                className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-1.5 font-bold transition-all ${
                  orderType === 'pickup'
                    ? 'border-[#D9AA55] bg-[#D9AA55]/15 text-white'
                    : 'border-white/10 text-neutral-400 hover:text-white'
                }`}
              >
                <span>🛍️ {lang === 'KU' ? 'وەرگرتن لە شوێن' : lang === 'AR' ? 'استلام من المطعم' : 'Pickup (Gulan St)'}</span>
              </button>
            </div>

            {/* Quick customer details */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={lang === 'KU' ? 'ناوت (ئارەزوومەندانە)' : lang === 'AR' ? 'اسمك (اختياري)' : 'Your name (optional)'}
                className="w-full px-2.5 py-1.5 rounded bg-black/50 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D95B32]"
              />
              {orderType === 'delivery' ? (
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={lang === 'KU' ? 'گەڕەک/شوێن لە هەولێر' : lang === 'AR' ? 'المنطقة أو العنوان' : 'Neighborhood / Address'}
                  className="w-full px-2.5 py-1.5 rounded bg-black/50 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D95B32]"
                />
              ) : (
                <div className="flex items-center text-[11px] text-[#D9AA55] px-2">
                  <MapPin size={12} className="mr-1 inline" />
                  <span>Gulan St, The Boulevard</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400 space-y-3">
              <div className="w-16 h-16 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center text-[#D9AA55]">
                <Flame size={32} />
              </div>
              <h3 className="text-lg font-bold text-white font-[family-name:var(--font-anton,Anton)]">
                {lang === 'KU' ? 'سەبەتەکەت بەتاڵە' : lang === 'AR' ? 'سلتك فارغة حالياً' : 'YOUR TRAY IS EMPTY'}
              </h3>
              <p className="text-xs max-w-xs text-neutral-400">
                {lang === 'KU'
                  ? 'بەرگەر یان خواردنێک لە مێنیو هەڵبژێرە بۆ دەستکاریکردن و زیادکردن'
                  : lang === 'AR'
                  ? 'اختر وجبة من القائمة لتخصيص المكونات والإضافات'
                  : 'Select any item from our menu to customize ingredients, toppings, and sauces!'}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-5 py-2.5 rounded-lg bg-[#D95B32] text-[#171717] font-bold text-xs uppercase tracking-wider hover:bg-[#e36a43] transition-colors"
              >
                {lang === 'KU' ? 'بینینی مێنیو' : lang === 'AR' ? 'تصفح القائمة' : 'Browse Menu'}
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-neutral-900/90 border border-white/10 flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.burgerName}
                      className="w-12 h-12 rounded-lg object-cover bg-neutral-800 flex-shrink-0"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-white leading-snug">
                        {item.burgerName}
                      </h4>
                      <div className="text-xs text-[#D9AA55] font-mono font-semibold">
                        {formatPrice(item.totalUnitPrice)} IQD each
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    aria-label={`Remove ${item.burgerName}`}
                    className="text-neutral-500 hover:text-red-400 p-1 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Customizations summary */}
                {((item.removedIngredients && item.removedIngredients.length > 0) ||
                  (item.addedExtras && item.addedExtras.length > 0) ||
                  (item.sauceLevel && item.sauceLevel !== 'Normal' && item.sauceLevel !== 'Standard') ||
                  item.specialInstructions) && (
                  <div className="text-[11px] bg-black/40 p-2 rounded-lg border border-white/5 space-y-1">
                    {item.removedIngredients && item.removedIngredients.length > 0 && (
                      <div className="text-red-400 flex items-center gap-1">
                        <span className="font-semibold">No:</span>
                        <span>{item.removedIngredients.join(', ')}</span>
                      </div>
                    )}
                    {item.addedExtras && item.addedExtras.length > 0 && (
                      <div className="text-[#D9AA55] flex flex-wrap items-center gap-1">
                        <span className="font-semibold text-white">Options:</span>
                        <span>
                          {item.addedExtras
                            .map((e) =>
                              e.price > 0 ? `+${e.name} (${formatPrice(e.price)})` : e.name
                            )
                            .join(', ')}
                        </span>
                      </div>
                    )}
                    {item.sauceLevel && item.sauceLevel !== 'Normal' && item.sauceLevel !== 'Standard' && (
                      <div className="text-neutral-300">
                        <span className="font-semibold text-white">Sauce:</span>{' '}
                        {item.sauceLevel}
                      </div>
                    )}
                    {item.specialInstructions && (
                      <div className="text-neutral-300 italic">
                        &ldquo;{item.specialInstructions}&rdquo;
                      </div>
                    )}
                  </div>
                )}

                {/* Quantity and Subtotal */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-md px-1 py-0.5">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center text-white hover:bg-white/10 rounded"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-5 text-center text-xs font-mono font-bold text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center text-white hover:bg-white/10 rounded"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-white font-[family-name:var(--font-anton,Anton)]">
                      {formatPrice(item.totalPrice)}
                    </span>
                    <span className="text-[10px] text-neutral-400 ml-1">IQD</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 bg-[#121212] border-t border-white/10 space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>
                  {lang === 'KU' ? 'کۆی خواردنەکان' : lang === 'AR' ? 'المجموع الفرعي' : `Items (${totalCount})`}
                </span>
                <span>{formatPrice(itemsSubtotal)} IQD</span>
              </div>
              {orderType === 'delivery' && (
                <div className="flex justify-between text-neutral-400">
                  <span>{lang === 'KU' ? 'کرێی گەیاندن' : lang === 'AR' ? 'رسوم التوصيل' : 'Delivery Fee (Erbil)'}</span>
                  <span>{formatPrice(deliveryFee)} IQD</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-white pt-1.5 border-t border-white/10">
                <span className="uppercase font-[family-name:var(--font-anton,Anton)] tracking-wider">
                  {lang === 'KU' ? 'کۆی گشتی' : lang === 'AR' ? 'المجموع النهائي' : 'Grand Total'}
                </span>
                <span className="text-base text-[#D9AA55] font-[family-name:var(--font-anton,Anton)]">
                  {formatPrice(grandTotal)} IQD
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyOrder}
                className="px-3 py-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center justify-center transition-colors"
                title="Copy order text"
              >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>

              <a
                href={buildWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-[#171717] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-green-900/30 transition-all font-[family-name:var(--font-anton,Anton)]"
              >
                <MessageCircle size={18} fill="currentColor" />
                {lang === 'KU'
                  ? 'داواکردن بە واتسئەپ'
                  : lang === 'AR'
                  ? 'إرسال الطلب عبر واتساب'
                  : 'Order on WhatsApp'}
                <ArrowRight size={16} />
              </a>
            </div>

            <p className="text-[10px] text-center text-neutral-400">
              {lang === 'KU'
                ? 'داواکارییەکەت ڕاستەوخۆ بە وردەکاری کەرەستە و شوێن بۆ چێشتخانە دەنێردرێت.'
                : lang === 'AR'
                ? 'سيتم إرسال تفاصيل التخصيص والعنوان مباشرة إلى المطبخ.'
                : 'Includes full custom ingredient specifications & Erbil delivery notes.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
