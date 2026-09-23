'use client'

import React, { useState } from 'react'
import {
  X,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Check,
  Flame,
  Sparkles,
  Image as ImageIcon,
  DollarSign,
  Tag,
  Package,
} from 'lucide-react'
import { BurgerItem } from './burger-customizer-modal'
import { StockIndicator } from './stock-indicator'

export type MenuCategory = 'Meat Burgers' | 'Chicken Burgers' | 'Sides' | 'Fries' | 'Drinks'

interface MenuManagerModalProps {
  isOpen: boolean
  onClose: () => void
  menuData: Record<MenuCategory, Array<BurgerItem>>
  onSaveMenu: (newMenuData: Record<MenuCategory, Array<BurgerItem>>) => void
  onResetToDefault: () => void
  initialCategory?: MenuCategory
  lang?: 'EN' | 'KU' | 'AR'
}

const PHOTO_PRESETS: Array<{ label: string; url: string }> = [
  {
    label: 'Smash Beef',
    url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Cheeseburger',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Spicy Beef',
    url: 'https://images.unsplash.com/photo-1582196016295-f8c8bd4b3e99?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Crispy Chicken',
    url: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Hot Chicken',
    url: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Chicken Tenders',
    url: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Dynamite Shrimps',
    url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Crispy Fries',
    url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Curly Fries',
    url: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Soda Drink',
    url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop&q=80',
  },
]

export function MenuManagerModal({
  isOpen,
  onClose,
  menuData,
  onSaveMenu,
  onResetToDefault,
  initialCategory = 'Meat Burgers',
  lang = 'EN',
}: MenuManagerModalProps) {
  const [activeCategory, setActiveCategory] = useState<MenuCategory>(initialCategory)
  const [currentMenu, setCurrentMenu] = useState<Record<MenuCategory, Array<BurgerItem>>>(menuData)
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)

  // Edit / Add Form State
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formBadge, setFormBadge] = useState('')
  const [formSpicy, setFormSpicy] = useState(false)
  const [formImage, setFormImage] = useState('')
  const [formStock, setFormStock] = useState('')

  // Sync incoming menuData when opened
  React.useEffect(() => {
    setCurrentMenu(menuData)
    setActiveCategory(initialCategory)
    setEditingItemIndex(null)
    setIsAddingNew(false)
  }, [isOpen, menuData, initialCategory])

  if (!isOpen) return null

  const isRtl = lang !== 'EN'
  const itemsInCat = currentMenu[activeCategory] || []

  const handleStartEdit = (index: number) => {
    const item = itemsInCat[index]
    if (!item) return
    setEditingItemIndex(index)
    setIsAddingNew(false)
    setFormName(item.name)
    setFormDesc(item.desc)
    setFormPrice(item.price)
    setFormBadge(item.badge || '')
    setFormSpicy(!!item.spicy)
    setFormImage(item.image)
    setFormStock(item.stock !== undefined ? String(item.stock) : '')
  }

  const handleStartAdd = () => {
    setEditingItemIndex(null)
    setIsAddingNew(true)
    setFormName('')
    setFormDesc('')
    setFormPrice('8,000')
    setFormBadge('NEW')
    setFormSpicy(false)
    setFormImage(PHOTO_PRESETS[0].url)
    setFormStock('')
  }

  const handleCancelForm = () => {
    setEditingItemIndex(null)
    setIsAddingNew(false)
  }

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formPrice.trim()) return

    const sanitizedPrice = formPrice.trim()
    const parsedStock = formStock.trim() !== '' ? Math.max(0, parseInt(formStock.trim(), 10)) : undefined
    const updatedItem: BurgerItem = {
      name: formName.trim(),
      desc: formDesc.trim() || 'Prepared fresh to order.',
      price: sanitizedPrice,
      image: formImage.trim() || PHOTO_PRESETS[0].url,
      badge: formBadge.trim() || undefined,
      category: activeCategory,
      spicy: formSpicy,
      stock: Number.isNaN(parsedStock) ? undefined : parsedStock,
    }

    const updatedCategoryList = [...itemsInCat]
    if (editingItemIndex !== null) {
      updatedCategoryList[editingItemIndex] = updatedItem
    } else {
      updatedCategoryList.push(updatedItem)
    }

    const newMenu = {
      ...currentMenu,
      [activeCategory]: updatedCategoryList,
    }

    setCurrentMenu(newMenu)
    onSaveMenu(newMenu)
    handleCancelForm()
  }

  const handleDeleteItem = (index: number) => {
    const itemToDelete = itemsInCat[index]
    if (!itemToDelete) return
    const confirmed = window.confirm(
      `Are you sure you want to remove "${itemToDelete.name}" from the menu?`
    )
    if (!confirmed) return

    const updatedCategoryList = itemsInCat.filter((_, i) => i !== index)
    const newMenu = {
      ...currentMenu,
      [activeCategory]: updatedCategoryList,
    }
    setCurrentMenu(newMenu)
    onSaveMenu(newMenu)
    if (editingItemIndex === index) {
      handleCancelForm()
    }
  }

  const handleReset = () => {
    const confirmed = window.confirm(
      'Reset all menu items and prices back to default official Erbil SMASH\'D menu?'
    )
    if (confirmed) {
      onResetToDefault()
      onClose()
    }
  }

  const categories: Array<{ id: MenuCategory; en: string; ar: string; ku: string; icon: string }> = [
    { id: 'Meat Burgers', en: 'Meat Burgers', ar: 'برجر اللحم', ku: 'بەرگەری گۆشت', icon: '🥩' },
    { id: 'Chicken Burgers', en: 'Chicken Burgers', ar: 'برجر الدجاج', ku: 'بەرگەری مریشک', icon: '🍗' },
    { id: 'Sides', en: 'Sides', ar: 'المقبلات', ku: 'خواردنی لاوەکی', icon: '🍤' },
    { id: 'Fries', en: 'Fries', ar: 'البطاطس', ku: 'پەتاتە', icon: '🍟' },
    { id: 'Drinks', en: 'Drinks', ar: 'المشروبات', ku: 'خواردنەوە', icon: '🥤' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#141414] border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#191919]">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[#D95B32] text-[#171717] flex items-center justify-center font-bold text-lg">
              🍔
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white uppercase font-[family-name:var(--font-anton,Anton)] tracking-wider">
                {lang === 'KU'
                  ? 'دەستکاریکردنی مینیۆ و نرخەکان'
                  : lang === 'AR'
                  ? 'تعديل قائمة الطعام والأسعار'
                  : 'Menu & Price Editor'}
              </h2>
              <p className="text-xs text-neutral-400">
                {lang === 'KU'
                  ? 'گۆڕینی ناو، نرخ لە دینار، وێنە یان زیادکردنی خواردنی نوێ'
                  : lang === 'AR'
                  ? 'تعديل أسماء الوجبات، الأسعار بالدينار العراقي، وإضافة أصناف جديدة'
                  : 'Modify dishes, update IQD prices, ingredients, or add new items.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-red-500/40 text-neutral-400 hover:text-red-400 text-xs flex items-center gap-1.5 transition-colors"
              title="Reset to default menu"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">
                {lang === 'KU' ? 'گەڕاندنەوە' : lang === 'AR' ? 'استعادة الافتراضي' : 'Reset Default'}
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Category Tabs inside Modal */}
        <div className="px-5 py-2.5 bg-[#171717] border-b border-white/10 flex gap-2 overflow-x-auto">
          {categories.map((cat) => {
            const count = currentMenu[cat.id]?.length || 0
            const isSelected = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id)
                  handleCancelForm()
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-bold whitespace-nowrap transition-all uppercase tracking-[0.5px] ${
                  isSelected
                    ? 'bg-[#D95B32] text-[#171717]'
                    : 'bg-[#101010] text-neutral-400 hover:text-white border border-white/10 hover:border-white/25'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{lang === 'KU' ? cat.ku : lang === 'AR' ? cat.ar : cat.en}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-[4px] font-bold ${
                    isSelected ? 'bg-black/20 text-[#171717]' : 'bg-white/10 text-neutral-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Content Body: Items List or Edit Form */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {isAddingNew || editingItemIndex !== null ? (
            /* Edit / Add Form */
            <form onSubmit={handleSaveItem} className="space-y-4 bg-[#171717] p-4 rounded-[8px] border border-white/10">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-[family-name:var(--font-anton,Anton)] flex items-center gap-2">
                  <Edit2 size={14} className="text-[#D95B32]" />
                  <span>
                    {isAddingNew
                      ? lang === 'KU'
                        ? 'زیادکردنی خواردنی نوێ'
                        : lang === 'AR'
                        ? 'إضافة وجبة جديدة'
                        : `Add New Item to ${activeCategory}`
                      : lang === 'KU'
                      ? 'دەستکاریکردنی خواردن'
                      : lang === 'AR'
                      ? 'تعديل بيانات الوجبة'
                      : `Edit: ${formName}`}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-xs text-neutral-400 hover:text-white uppercase tracking-[0.5px] font-bold"
                >
                  {lang === 'KU' ? 'پاشگەزبوونەوە' : lang === 'AR' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                    {lang === 'KU' ? 'ناوی خواردن' : lang === 'AR' ? 'اسم الوجبة' : 'Item Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Triple Smash Tower"
                    className="w-full bg-[#101010] border border-white/15 rounded-[4px] px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-[#D95B32]"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                    {lang === 'KU' ? 'نرخ (دیناری عێراقی)' : lang === 'AR' ? 'السعر (دينار عراقي)' : 'Price (IQD)'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. 8,500"
                    className="w-full bg-[#101010] border border-white/15 rounded-[4px] px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-[#D95B32]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1 text-[11px] uppercase tracking-wider">
                  {lang === 'KU' ? 'پێکهاتەکان / وەسف' : lang === 'AR' ? 'المكونات / الوصف' : 'Description & Ingredients'}
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Single smashed beef patty, melted cheddar, pickles, house sauce..."
                  className="w-full bg-[#101010] border border-white/15 rounded-[4px] px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D95B32]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                    {lang === 'KU' ? 'نیشانە (Badge)' : lang === 'AR' ? 'الشارة (Badge)' : 'Badge Label (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="e.g. SIGNATURE, BESTSELLER, NEW"
                    className="w-full bg-[#101010] border border-white/15 rounded-[4px] px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-[#D95B32]"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-semibold mb-1 flex items-center justify-between uppercase tracking-wider text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <Package size={12} className="text-[#D9AA55]" />
                      <span>{lang === 'KU' ? 'ئاستی بەردەستبوون' : lang === 'AR' ? 'مستوى المخزون' : 'Stock Count (Inventory)'}</span>
                    </span>
                    <span className="text-[10px] text-neutral-400 font-normal">
                      {lang === 'KU' ? '١-٣ کەمە، ٤-٦ دیاریکراو' : lang === 'AR' ? '1-3 منخفض، 4-6 محدود' : '1-3: Low, 4-6: Limited'}
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    placeholder="e.g. 3 for Low Stock, or leave empty"
                    className="w-full bg-[#101010] border border-white/15 rounded-[4px] px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-[#D95B32]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formSpicy}
                    onChange={(e) => setFormSpicy(e.target.checked)}
                    className="w-4 h-4 rounded text-[#D95B32] focus:ring-[#D95B32] bg-[#101010] border-white/20"
                  />
                  <span className="font-semibold text-neutral-300 flex items-center gap-1 text-xs">
                    <Flame size={14} className="text-[#D95B32]" />
                    <span>{lang === 'KU' ? 'تیژ (Spicy)' : lang === 'AR' ? 'حار (Spicy 🌶️)' : 'Spicy Item 🌶️'}</span>
                  </span>
                </label>
              </div>

              {/* Photo Selector */}
              <div>
                <label className="block text-neutral-300 font-semibold mb-1 text-[11px] uppercase tracking-wider">
                  {lang === 'KU' ? 'وێنەی خواردن (URL یان هەڵبژاردن لە خوارەوە)' : lang === 'AR' ? 'صورة الوجبة (رابط أو اختر من النماذج)' : 'Photo URL (or pick a photo preset)'}
                </label>
                <input
                  type="url"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-[#101010] border border-white/15 rounded-[4px] px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D95B32] mb-2"
                />

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {PHOTO_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setFormImage(preset.url)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[11px] border transition-all ${
                        formImage === preset.url
                          ? 'border-[#D95B32] bg-[#D95B32]/20 text-[#D9AA55] font-bold'
                          : 'border-white/10 bg-[#101010] text-neutral-400 hover:text-white'
                      }`}
                    >
                      <ImageIcon size={11} />
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-4 py-2 rounded-[4px] border border-white/15 text-xs font-bold uppercase tracking-[0.5px] text-neutral-300 hover:bg-white/5 transition-all hover:-translate-y-0.5"
                >
                  {lang === 'KU' ? 'پاشگەزبوونەوە' : lang === 'AR' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-[4px] bg-[#D95B32] hover:bg-[#e36a43] text-[#171717] text-xs font-bold uppercase tracking-[0.5px] transition-all hover:-translate-y-0.5 flex items-center gap-1.5 shadow-md"
                >
                  <Check size={14} />
                  <span>
                    {isAddingNew
                      ? lang === 'KU'
                        ? 'زیادکردن بۆ مینیۆ'
                        : lang === 'AR'
                        ? 'حفظ وإضافة'
                        : 'Add to Menu'
                      : lang === 'KU'
                      ? 'پاشەکەوتکردنی گۆڕانکاری'
                      : lang === 'AR'
                      ? 'حفظ التعديلات'
                      : 'Save Changes'}
                  </span>
                </button>
              </div>
            </form>
          ) : (
            /* Items List View */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-medium">
                  {itemsInCat.length} {itemsInCat.length === 1 ? 'item' : 'items'} in {activeCategory}
                </span>
                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="px-3 py-1.5 rounded-[4px] bg-[#D95B32] hover:bg-[#e36a43] text-[#171717] text-xs font-bold uppercase tracking-[0.5px] transition-all hover:-translate-y-0.5 flex items-center gap-1 shadow-sm"
                >
                  <Plus size={14} />
                  <span>
                    {lang === 'KU' ? '+ زیادکردنی خواردن' : lang === 'AR' ? '+ إضافة صنف جديد' : '+ Add Item'}
                  </span>
                </button>
              </div>

              {itemsInCat.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-white/15 rounded-[8px] text-neutral-400 text-xs">
                  No items in this category yet. Click "+ Add Item" to create one.
                </div>
              ) : (
                <div className="divide-y divide-white/10 border border-white/10 rounded-[8px] overflow-hidden bg-[#171717]">
                  {itemsInCat.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-12 h-12 rounded-[4px] object-cover border border-white/10 flex-shrink-0"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=800&auto=format&fit=crop&q=80'
                          }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-white truncate">
                              {item.name}
                            </h4>
                            {item.spicy && (
                              <span className="text-[8px] text-[#D95B32] bg-[#ffe5dc] border border-[#D95B32]/30 px-1.5 py-0.5 rounded-[4px] font-bold uppercase tracking-[0.5px]">
                                🌶️ SPICY
                              </span>
                            )}
                            {item.badge && (
                              <span className="text-[8px] text-[#171717] bg-[#D9AA55] px-1.5 py-0.5 rounded-[4px] font-bold uppercase tracking-[0.5px]">
                                {item.badge}
                              </span>
                            )}
                            {item.stock !== undefined && (
                              <StockIndicator count={item.stock} lang={lang} variant="compact" />
                            )}
                          </div>
                          <p className="text-xs text-neutral-400 truncate max-w-md mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <span className="text-sm font-bold text-[#D9AA55]">
                            {item.price}
                          </span>
                          <span className="text-[10px] text-neutral-400 block -mt-0.5">
                            IQD
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(index)}
                            className="p-1.5 rounded-[4px] hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
                            title="Edit Item"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(index)}
                            className="p-1.5 rounded-[4px] hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors"
                            title="Delete Item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#191919] flex items-center justify-between text-xs text-neutral-400">
          <span>
            {lang === 'KU'
              ? 'گۆڕانکارییەکان ڕاستەوخۆ لە وێبگەڕەکەت پاشەکەوت دەبن'
              : lang === 'AR'
              ? 'يتم حفظ التعديلات تلقائياً في المتصفح'
              : 'All edits are saved to local storage.'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-[4px] bg-[#D95B32] hover:bg-[#e36a43] text-[#171717] font-bold uppercase tracking-[0.5px] transition-all hover:-translate-y-0.5"
          >
            {lang === 'KU' ? 'داخستن' : lang === 'AR' ? 'إغلاق' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  )
}
