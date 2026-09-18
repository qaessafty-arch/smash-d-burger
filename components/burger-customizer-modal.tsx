'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { X, Plus, Minus, Check, Flame, Sparkles } from 'lucide-react'
import { StockIndicator } from './stock-indicator'

export interface BurgerItem {
  name: string
  desc: string
  price: string // e.g. "8,500"
  image: string
  badge?: string
  category?: 'Meat Burgers' | 'Chicken Burgers' | 'Sides' | 'Fries' | 'Drinks' | 'Burgers' | 'Combos'
  spicy?: boolean
  stock?: number
}

export interface CustomizationOption {
  id: string
  name: string
  price: number // in IQD
}

export interface CustomizedBurgerOrder {
  id: string
  burgerName: string
  image: string
  basePrice: number
  totalUnitPrice: number
  totalPrice: number
  quantity: number
  removedIngredients: string[]
  addedExtras: CustomizationOption[]
  sauceLevel: string
  specialInstructions: string
  category?: string
}

const DEFAULT_INGREDIENTS: Record<string, string[]> = {
  'All American': [
    'Single Smashed Beef Patty',
    'American Cheese',
    'Ketchup',
    'Mustard',
    'Raw Onions',
    'Pickles',
    'House Sauce',
  ],
  'OG Smash': [
    'Single Smashed Beef Patty',
    'American Cheese',
    'House Sauce',
    'Pickles',
    'Caramelized Onions',
  ],
  'Jalapeño': [
    'Single Smashed Beef Patty',
    'American Cheese',
    'House Sauce',
    'Caramelized Onions',
    'Fresh Jalapeños',
  ],
  'Golden Crunch': [
    'Crispy Chicken',
    'American Cheese',
    'Lettuce',
    'Tomato',
    'House Sauce',
  ],
  'Hot Chicken': [
    'Crispy Chicken',
    'American Cheese',
    'Lettuce',
    'Tomato',
    'Spicy Sauce',
  ],
  'Sweet Heat': [
    'Crispy Chicken',
    'American Cheese',
    'Lettuce',
    'Tomato',
    'Sweet Spicy Sauce',
  ],
  'Loaded Fries': [
    'Crispy Fries',
    'Melted Cheese',
    'Caramelized Onions',
    'Jalapeños',
    'House Sauce',
  ],
  'Crispy Chicken Tenders (5 pcs)': [
    '5 Pcs Crispy Chicken Tenders',
    'House Dipping Sauce',
  ],
  'Dynamite Shrimps (7 pcs)': [
    '7 Pcs Crispy Shrimps',
    'Spicy Dynamite Sauce',
  ],
  'Jalapeño Poppers (7 pcs)': [
    '7 Pcs Jalapeño Poppers',
    'Mixed Molten Cheese Filling',
  ],
  'Chicken Popcorn': [
    'Bite-Sized Crispy Chicken',
    'House Dipping Sauce',
  ],
  'Classic Fries': ['Crispy French Fries', 'Sea Salt'],
  'Curly Fries': ['Golden Curly Fries', 'House Spice Seasoning'],
  'Seasoned Fries': ['Crispy French Fries', 'Cajun Herb Spice Blend'],
}

const BURGER_EXTRAS: CustomizationOption[] = [
  { id: 'extra-patty', name: '+ Extra Patty (Smashed Beef)', price: 1500 },
  { id: 'extra-cheese', name: 'Extra American Cheese', price: 1000 },
  { id: 'caramelized-onions', name: 'Caramelized Onions', price: 500 },
  { id: 'jalapenos', name: 'Fresh Jalapeños', price: 500 },
  { id: 'extra-house-sauce', name: 'Extra House Sauce (in burger)', price: 500 },
  { id: 'extra-spicy-sauce', name: 'Extra Spicy Sauce (in burger)', price: 500 },
  { id: 'side-dip-house', name: 'Side Dip: House Sauce', price: 500 },
  { id: 'side-dip-dynamite', name: 'Side Dip: Dynamite Sauce', price: 1000 },
  { id: 'side-dip-cheese', name: 'Side Dip: Melted Cheddar', price: 1000 },
]

interface BurgerCustomizerModalProps {
  burger: BurgerItem | null
  isOpen: boolean
  onClose: () => void
  onAddToCart: (customizedOrder: CustomizedBurgerOrder) => void
  stockCount?: number
  lang?: 'EN' | 'KU' | 'AR'
}

function parsePrice(priceStr: string): number {
  const numeric = priceStr.replace(/[^0-9]/g, '')
  return parseInt(numeric, 10) || 0
}

function formatPrice(num: number): string {
  return num.toLocaleString('en-US')
}

export function BurgerCustomizerModal({
  burger,
  isOpen,
  onClose,
  onAddToCart,
  stockCount,
  lang = 'EN',
}: BurgerCustomizerModalProps) {
  const isRtl = lang !== 'EN'
  const isSoldOut = stockCount !== undefined && stockCount <= 0

  const category = useMemo(() => {
    if (!burger) return 'Meat Burgers'
    if (burger.category) return burger.category
    if (['All American', 'OG Smash', 'Jalapeño', 'Classic Smash', 'Double Cheese', 'Double Cheese Smash', 'Spicy Erbil'].includes(burger.name)) return 'Meat Burgers'
    if (['Golden Crunch', 'Hot Chicken', 'Sweet Heat', 'Chicken Smash'].includes(burger.name)) return 'Chicken Burgers'
    if (['Crispy Chicken Tenders (5 pcs)', 'Dynamite Shrimps (7 pcs)', 'Jalapeño Poppers (7 pcs)', 'Chicken Popcorn', 'Loaded Fries'].includes(burger.name)) return 'Sides'
    if (['Classic Fries', 'Curly Fries', 'Seasoned Fries', 'Classic', 'Curly', 'Seasoned'].includes(burger.name)) return 'Fries'
    if (['Pepsi', '7UP', 'Mirinda', 'Mineral Water', 'Soft Drink', 'Water'].includes(burger.name)) return 'Drinks'
    return 'Meat Burgers'
  }, [burger])

  const isBurgerType =
    category === 'Meat Burgers' ||
    category === 'Chicken Burgers' ||
    category === 'Burgers'

  const baseIngredients = useMemo(() => {
    if (!burger) return []
    return (
      DEFAULT_INGREDIENTS[burger.name] || [
        'Single Smashed Beef Patty',
        'American Cheese',
        'House Sauce',
        'Pickles',
      ]
    )
  }, [burger])

  // State
  const [removed, setRemoved] = useState<string[]>([])
  const [selectedExtras, setSelectedExtras] = useState<CustomizationOption[]>([])
  const [sauceLevel, setSauceLevel] = useState<'Normal' | 'Extra' | 'Light' | 'On The Side'>('Normal')
  const [instructions, setInstructions] = useState('')
  const [quantity, setQuantity] = useState(1)

  // Sides specific options
  const [sideSize, setSideSize] = useState<'Regular' | 'Large'>('Regular')
  const [sideSeasoning, setSideSeasoning] = useState('Classic Sea Salt')
  const [sideDip, setSideDip] = useState('House Smash Sauce')

  // Drinks specific options
  const [drinkFlavor, setDrinkFlavor] = useState('Coca-Cola')
  const [drinkIce, setDrinkIce] = useState('Normal Ice')
  const [shakeWhippedCream, setShakeWhippedCream] = useState(true)

  // Combos specific options
  const [comboBurger, setComboBurger] = useState('Classic Smash')
  const [comboSide, setComboSide] = useState('Crispy Fries')
  const [comboDrink, setComboDrink] = useState('Coca-Cola')

  // Reset states on open
  useEffect(() => {
    if (isOpen && burger) {
      setRemoved([])
      setSelectedExtras([])
      setSauceLevel('Normal')
      setInstructions('')
      setQuantity(1)
      setSideSize('Regular')
      setSideSeasoning('Classic Sea Salt')
      setSideDip('House Smash Sauce')
      setDrinkFlavor(burger.name === 'Milkshake' ? 'Vanilla Bean' : 'Coca-Cola')
      setDrinkIce('Normal Ice')
      setShakeWhippedCream(true)
      setComboBurger(burger.name.includes('Double') ? 'Double Cheese Smash' : 'Classic Smash')
      setComboSide('Crispy Fries')
      setComboDrink('Coca-Cola')
    }
  }, [isOpen, burger])

  if (!isOpen || !burger) return null

  const basePriceNumber = parsePrice(burger.price)

  // Calculate dynamic upgrades
  let extraCharges = selectedExtras.reduce((sum, extra) => sum + extra.price, 0)
  if (category === 'Sides' && sideSize === 'Large') {
    extraCharges += 1500
  }
  if (category === 'Sides' && sideDip === 'Melted Cheddar (+1,000 IQD)') {
    extraCharges += 1000
  }
  if (category === 'Drinks' && burger.name === 'Milkshake' && shakeWhippedCream) {
    extraCharges += 500
  }
  if (category === 'Combos') {
    if (comboBurger === 'Double Cheese Smash (+4,000 IQD)') extraCharges += 4000
    if (comboBurger === 'Spicy Erbil Smash (+2,000 IQD)') extraCharges += 2000
    if (comboSide === 'Loaded Fries (+2,500 IQD)') extraCharges += 2500
    if (comboSide === 'Onion Rings (+1,500 IQD)') extraCharges += 1500
  }

  const unitTotal = basePriceNumber + extraCharges
  const finalTotal = unitTotal * quantity

  const toggleRemoveIngredient = (ingredient: string) => {
    setRemoved((prev) =>
      prev.includes(ingredient)
        ? prev.filter((item) => item !== ingredient)
        : [...prev, ingredient]
    )
  }

  const toggleExtra = (extra: CustomizationOption) => {
    setSelectedExtras((prev) => {
      const exists = prev.some((e) => e.id === extra.id)
      if (exists) {
        return prev.filter((e) => e.id !== extra.id)
      } else {
        return [...prev, extra]
      }
    })
  }

  const handleAdd = () => {
    const finalExtras: CustomizationOption[] = [...selectedExtras]

    if (category === 'Sides') {
      if (sideSize === 'Large') finalExtras.push({ id: 'side-large', name: 'Size: Large', price: 1500 })
      finalExtras.push({ id: 'side-seasoning', name: `Seasoning: ${sideSeasoning}`, price: 0 })
      finalExtras.push({ id: 'side-dip', name: `Dip: ${sideDip}`, price: sideDip.includes('1,000') ? 1000 : 0 })
    } else if (category === 'Drinks') {
      finalExtras.push({ id: 'drink-flavor', name: `Flavor: ${drinkFlavor}`, price: 0 })
      if (burger.name === 'Milkshake') {
        if (shakeWhippedCream) finalExtras.push({ id: 'whipped-cream', name: 'With Whipped Cream', price: 500 })
      } else if (burger.name !== 'Water') {
        finalExtras.push({ id: 'ice-level', name: `Ice: ${drinkIce}`, price: 0 })
      }
    } else if (category === 'Combos') {
      finalExtras.push({ id: 'combo-burger', name: `Burger: ${comboBurger}`, price: 0 })
      finalExtras.push({ id: 'combo-side', name: `Side: ${comboSide}`, price: 0 })
      finalExtras.push({ id: 'combo-drink', name: `Drink: ${comboDrink}`, price: 0 })
    }

    const order: CustomizedBurgerOrder = {
      id: `${burger.name}-${Date.now()}`,
      burgerName: burger.name,
      image: burger.image,
      basePrice: basePriceNumber,
      totalUnitPrice: unitTotal,
      totalPrice: finalTotal,
      quantity,
      removedIngredients: removed,
      addedExtras: finalExtras,
      sauceLevel: category === 'Burgers' ? sauceLevel : 'Standard',
      specialInstructions: instructions.trim(),
      category,
    }
    onAddToCart(order)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-[#171717] text-white rounded-t-2xl sm:rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with image banner */}
        <div className="relative h-40 sm:h-44 w-full bg-[#121212] overflow-hidden flex-shrink-0">
          <img
            src={burger.image}
            alt={burger.name}
            className="w-full h-full object-cover object-center opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#171717] via-[#171717]/60 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close customizer"
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors border border-white/20"
          >
            <X size={18} />
          </button>

          {/* Title and details overlay */}
          <div className="absolute bottom-3 left-4 right-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-[4px] bg-[#D95B32] text-[#171717] uppercase tracking-[0.5px]">
                <Flame size={11} fill="currentColor" /> {category.toUpperCase()}
              </span>
              {burger.badge && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-[4px] bg-[#D9AA55] text-[#171717] uppercase tracking-[0.5px]">
                  {burger.badge}
                </span>
              )}
              {stockCount !== undefined && (
                <StockIndicator count={stockCount} lang={lang} variant="compact" />
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-normal tracking-wide uppercase font-[family-name:var(--font-anton,Anton)] leading-none text-white">
              {burger.name}
            </h2>
            <p className="text-xs text-neutral-300 mt-1 max-w-md line-clamp-2">
              {burger.desc}
            </p>
          </div>
        </div>

        {/* Scrollable Customization Body */}
        <div className="overflow-y-auto px-4 sm:px-6 py-4 space-y-5 flex-1 divide-y divide-white/10 text-sm">
          {/* CATEGORY: MEAT / CHICKEN BURGERS */}
          {isBurgerType && (
            <>
              {/* Ingredients Removal */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider font-[family-name:var(--font-anton,Anton)]">
                      {lang === 'KU' ? '١. کەرەستەکان و لادان' : lang === 'AR' ? '1. المكونات والإزالة' : '1. Ingredients & Removals'}
                    </h3>
                    <p className="text-xs text-neutral-400">
                      {lang === 'KU'
                        ? 'کرتە بکە بۆ لادانی هەر کەرەستەیەک لە بەرگەرەکەت'
                        : lang === 'AR'
                        ? 'اضغط لإزالة أي مكون من البرجر'
                        : 'Tap to remove any standard ingredient from your burger.'}
                    </p>
                  </div>
                  {removed.length > 0 && (
                    <span className="text-[11px] text-[#D95B32] font-semibold">
                      {removed.length} removed
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {baseIngredients.map((ingredient) => {
                    const isRemoved = removed.includes(ingredient)
                    return (
                      <button
                        key={ingredient}
                        type="button"
                        onClick={() => toggleRemoveIngredient(ingredient)}
                        className={`flex items-center justify-between px-3 py-2 rounded-[4px] border text-left transition-all ${
                          isRemoved
                            ? 'border-red-500/40 bg-red-950/25 text-neutral-400 line-through'
                            : 'border-white/10 bg-[#1a1a1a] text-white hover:border-[#D95B32]/50'
                        }`}
                      >
                        <span className="text-xs font-medium">
                          {isRemoved ? `No ${ingredient}` : ingredient}
                        </span>
                        <span
                          className={`w-5 h-5 rounded-[4px] flex items-center justify-center text-[10px] ${
                            isRemoved
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-white/10 text-neutral-400'
                          }`}
                        >
                          {isRemoved ? <X size={12} /> : <Check size={12} />}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Add-ons & Extras */}
              <div className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider font-[family-name:var(--font-anton,Anton)]">
                      {lang === 'KU' ? '٢. زیادکردن و تەواوکەرەکان' : lang === 'AR' ? '2. الإضافات والترقية' : '2. Add Extras & Upgrades'}
                    </h3>
                    <p className="text-xs text-neutral-400">
                      {lang === 'KU'
                        ? '+ گۆشتی سمەش ١,٥٠٠، پەنیر، هالاپینۆ یان سۆس'
                        : lang === 'AR'
                        ? '+ كبس شريحة لحم 1,500، جبنة إضافية أو هالبينو'
                        : '+ Extra Patty (1,500 IQD), melted cheese, sauce & toppings.'}
                    </p>
                  </div>
                  <span className="text-[10px] text-[#D9AA55] font-bold uppercase bg-[#D9AA55]/10 px-2 py-0.5 rounded-[4px] border border-[#D9AA55]/30">
                    Menu Extras
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {BURGER_EXTRAS.map((extra) => {
                    const isSelected = selectedExtras.some((e) => e.id === extra.id)
                    const isExtraPatty = extra.id === 'extra-patty'
                    return (
                      <button
                        key={extra.id}
                        type="button"
                        onClick={() => toggleExtra(extra)}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-[4px] border text-left transition-all ${
                          isSelected
                            ? 'border-[#D95B32] bg-[#D95B32]/15 text-white shadow-sm'
                            : isExtraPatty
                            ? 'border-[#D95B32]/40 bg-[#D95B32]/5 text-neutral-200 hover:border-[#D95B32]'
                            : 'border-white/10 bg-[#1a1a1a] text-neutral-300 hover:border-white/20'
                        }`}
                      >
                        <div>
                          <div className={`text-xs font-semibold ${isExtraPatty ? 'text-[#D9AA55]' : 'text-white'}`}>
                            {extra.name}
                          </div>
                          <div className="text-[11px] text-[#D9AA55] font-bold">
                            +{formatPrice(extra.price)} IQD
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-[4px] flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-[#D95B32] text-[#171717]'
                              : 'border border-white/20 text-transparent'
                          }`}
                        >
                          <Check size={13} strokeWidth={3} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Sauce Level */}
              <div className="pt-4">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider font-[family-name:var(--font-anton,Anton)] mb-1">
                  {lang === 'KU' ? '٣. ئاستی سۆس' : lang === 'AR' ? '3. كمية الصوص' : '3. Sauce Level'}
                </h3>
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {(['Normal', 'Extra', 'Light', 'On The Side'] as const).map((level) => {
                    const isSelected = sauceLevel === level
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setSauceLevel(level)}
                        className={`py-2 px-1 text-center rounded-[4px] border text-xs font-medium transition-all ${
                          isSelected
                            ? 'border-[#D95B32] bg-[#D95B32] text-[#171717] font-bold'
                            : 'border-white/10 bg-[#1a1a1a] text-neutral-300 hover:bg-[#242424]'
                        }`}
                      >
                        {level}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* CATEGORY: FRIES */}
          {category === 'Fries' && (
            <>
              <div className="pt-1">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider font-[family-name:var(--font-anton,Anton)] mb-2">
                  {lang === 'KU' ? 'بەهاراتی پەتاتە' : lang === 'AR' ? 'نكهة وتوابل البطاطس' : 'Fries Seasoning Style'}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {['Classic Sea Salt', 'Smoky Cajun', 'Garlic & Herb'].map((season) => (
                    <button
                      key={season}
                      type="button"
                      onClick={() => setSideSeasoning(season)}
                      className={`py-2.5 px-2 text-center rounded-[4px] border text-xs font-semibold transition-all ${
                        sideSeasoning === season
                          ? 'border-[#D95B32] bg-[#D95B32] text-[#171717] font-bold'
                          : 'border-white/10 bg-[#1a1a1a] text-neutral-300 hover:bg-[#242424]'
                      }`}
                    >
                      {season}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider font-[family-name:var(--font-anton,Anton)] mb-2">
                  {lang === 'KU' ? 'سۆسی دڵخوازت' : lang === 'AR' ? 'الصوص الجانبي' : 'Side Dipping Cup'}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'House Smash Sauce',
                    'Spicy Mayo',
                    'Garlic Mayo',
                    'Melted Cheddar (+1,000 IQD)',
                  ].map((dip) => (
                    <button
                      key={dip}
                      type="button"
                      onClick={() => setSideDip(dip)}
                      className={`p-2.5 rounded-[4px] border text-left text-xs font-medium transition-all ${
                        sideDip === dip
                          ? 'border-[#D9AA55] bg-[#D9AA55]/15 text-white font-bold'
                          : 'border-white/10 bg-[#1a1a1a] text-neutral-300 hover:bg-[#242424]'
                      }`}
                    >
                      {dip}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* CATEGORY: SIDES */}
          {category === 'Sides' && (
            <>
              {/* Portion size */}
              <div className="pt-1">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider font-[family-name:var(--font-anton,Anton)] mb-2">
                  {lang === 'KU' ? 'قەبارەی بەشەکە' : lang === 'AR' ? 'حجم الوجبة' : 'Portion Size'}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Regular', label: 'Regular Portion', price: 'Included' },
                    { id: 'Large', label: 'Large Portion (+1,500 IQD)', price: '+1,500 IQD' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSideSize(p.id as 'Regular' | 'Large')}
                      className={`p-3 rounded-[4px] border text-left flex justify-between items-center transition-all ${
                        sideSize === p.id
                          ? 'border-[#D95B32] bg-[#D95B32]/15 text-white font-bold'
                          : 'border-white/10 bg-[#1a1a1a] text-neutral-300 hover:border-white/20'
                      }`}
                    >
                      <span>{p.label}</span>
                      {sideSize === p.id && <Check size={16} className="text-[#D95B32]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seasoning */}
              <div className="pt-4">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider font-[family-name:var(--font-anton,Anton)] mb-2">
                  {lang === 'KU' ? 'تام و بەهارات' : lang === 'AR' ? 'التوابل' : 'Seasoning Style'}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {['Classic Sea Salt', 'Smoky Cajun', 'Rosemary Garlic'].map((season) => (
                    <button
                      key={season}
                      type="button"
                      onClick={() => setSideSeasoning(season)}
                      className={`py-2 px-1 text-center rounded-[4px] border text-xs font-medium transition-all ${
                        sideSeasoning === season
                          ? 'border-[#D95B32] bg-[#D95B32] text-[#171717] font-bold'
                          : 'border-white/10 bg-[#1a1a1a] text-neutral-300 hover:bg-[#242424]'
                      }`}
                    >
                      {season}
                    </button>
                  ))}
                </div>
              </div>

              {/* Side Dip Cup */}
              <div className="pt-4">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider font-[family-name:var(--font-anton,Anton)] mb-2">
                  {lang === 'KU' ? 'سۆسی دڵخوازت' : lang === 'AR' ? 'الصوص الجانبي' : 'Choice of Side Dip'}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'House Smash Sauce',
                    'Spicy Mayo',
                    'Garlic Mayo',
                    'Melted Cheddar (+1,000 IQD)',
                  ].map((dip) => (
                    <button
                      key={dip}
                      type="button"
                      onClick={() => setSideDip(dip)}
                      className={`p-2.5 rounded-[4px] border text-left text-xs font-medium transition-all ${
                        sideDip === dip
                          ? 'border-[#D9AA55] bg-[#D9AA55]/15 text-white font-bold'
                          : 'border-white/10 bg-[#1a1a1a] text-neutral-300 hover:bg-[#242424]'
                      }`}
                    >
                      {dip}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* CATEGORY: DRINKS */}
          {category === 'Drinks' && (
            <>
              {burger.name === 'Milkshake' ? (
                <>
                  <div className="pt-1">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider font-[family-name:var(--font-anton,Anton)] mb-2">
                      {lang === 'KU' ? 'تامی میلکشەیک' : lang === 'AR' ? 'نكهة الميلك شيك' : 'Milkshake Flavor'}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        'Vanilla Bean',
                        'Belgian Chocolate',
                        'Salted Caramel',
                        'Lotus Biscoff',
                        'Fresh Strawberry',
                      ].map((flavor) => (
                        <button
                          key={flavor}
                          type="button"
                          onClick={() => setDrinkFlavor(flavor)}
                          className={`p-2.5 rounded-[4px] border text-left text-xs font-medium transition-all ${
                            drinkFlavor === flavor
                              ? 'border-[#D95B32] bg-[#D95B32] text-[#171717] font-bold'
                              : 'border-white/10 bg-[#1a1a1a] text-neutral-300 hover:bg-[#242424]'
                          }`}
                        >
                          {flavor}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => setShakeWhippedCream((v) => !v)}
                      className={`w-full p-3 rounded-[4px] border flex items-center justify-between text-xs font-semibold ${
                        shakeWhippedCream
                          ? 'border-[#D9AA55] bg-[#D9AA55]/15 text-white'
                          : 'border-white/10 bg-[#1a1a1a] text-neutral-400 hover:border-white/20'
                      }`}
                    >
                      <span>Add Fresh Whipped Cream (+500 IQD)</span>
                      {shakeWhippedCream ? (
                        <Check size={16} className="text-[#D9AA55]" />
                      ) : (
                        <span className="text-[11px] text-neutral-500">None</span>
                      )}
                    </button>
                  </div>
                </>
              ) : burger.name === 'Water' ? (
                <div className="pt-1">
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider font-[family-name:var(--font-anton,Anton)] mb-2">
                    {lang === 'KU' ? 'پلەی گەرمی' : lang === 'AR' ? 'درجة الحرارة' : 'Temperature'}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['Chilled (Ice Cold)', 'Room Temperature'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setDrinkFlavor(t)}
                        className={`p-3 rounded-[4px] border text-left text-xs font-semibold ${
                          drinkFlavor === t
                            ? 'border-[#D95B32] bg-[#D95B32] text-[#171717]'
                            : 'border-white/10 bg-[#1a1a1a] text-neutral-300 hover:bg-[#242424]'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="pt-1">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider font-[family-name:var(--font-anton,Anton)] mb-2">
                      {lang === 'KU' ? 'جۆری خواردنەوە' : lang === 'AR' ? 'نوع المشروب' : 'Soft Drink Selection'}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {['Pepsi', '7UP', 'Mirinda Orange', 'Diet Pepsi', 'Mountain Dew', 'Kinza Citrus'].map(
                        (flavor) => (
                          <button
                            key={flavor}
                            type="button"
                            onClick={() => setDrinkFlavor(flavor)}
                            className={`p-2.5 rounded-[4px] border text-left text-xs font-medium transition-all ${
                              drinkFlavor === flavor
                                ? 'border-[#D95B32] bg-[#D95B32] text-[#171717] font-bold'
                                : 'border-white/10 bg-[#1a1a1a] text-neutral-300 hover:bg-[#242424]'
                            }`}
                          >
                            {flavor}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="pt-4">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider font-[family-name:var(--font-anton,Anton)] mb-2">
                      {lang === 'KU' ? 'ئاستی سەهۆڵ' : lang === 'AR' ? 'كمية الثلج' : 'Ice Preference'}
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {['Normal Ice', 'Extra Ice', 'No Ice'].map((ice) => (
                        <button
                          key={ice}
                          type="button"
                          onClick={() => setDrinkIce(ice)}
                          className={`py-2 px-1 text-center rounded-[4px] border text-xs font-medium transition-all ${
                            drinkIce === ice
                              ? 'border-[#D9AA55] bg-[#D9AA55] text-black font-bold'
                              : 'border-white/10 bg-[#1a1a1a] text-neutral-300 hover:bg-[#242424]'
                          }`}
                        >
                          {ice}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* CATEGORY: COMBOS */}
          {category === 'Combos' && (
            <>
              <div className="pt-1">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider font-[family-name:var(--font-anton,Anton)] mb-2">
                  {lang === 'KU' ? '١. بەرگەرەکە هەڵبژێرە' : lang === 'AR' ? '1. اختر البرجر' : '1. Select Burger'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    'Classic Smash',
                    'Double Cheese Smash (+4,000 IQD)',
                    'Spicy Erbil Smash (+2,000 IQD)',
                    'Chicken Smash (+1,000 IQD)',
                  ].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setComboBurger(b)}
                      className={`p-2.5 rounded-[4px] border text-left text-xs font-medium ${
                        comboBurger === b
                          ? 'border-[#D95B32] bg-[#D95B32]/15 text-white font-bold'
                          : 'border-white/10 bg-[#1a1a1a] text-neutral-300 hover:bg-[#242424]'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider font-[family-name:var(--font-anton,Anton)] mb-2">
                  {lang === 'KU' ? '٢. پەتاتە یان تەنیشت' : lang === 'AR' ? '2. اختر البطاطس' : '2. Select Fries'}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {['Crispy Fries', 'Loaded Fries (+2,500 IQD)', 'Onion Rings (+1,500 IQD)'].map(
                    (s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setComboSide(s)}
                        className={`p-2 rounded-[4px] border text-center text-xs font-medium ${
                          comboSide === s
                            ? 'border-[#D9AA55] bg-[#D9AA55] text-black font-bold'
                            : 'border-white/10 bg-[#1a1a1a] text-neutral-300 hover:bg-[#242424]'
                        }`}
                      >
                        {s}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="pt-4">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider font-[family-name:var(--font-anton,Anton)] mb-2">
                  {lang === 'KU' ? '٣. خواردنەوەکەت هەڵبژێرە' : lang === 'AR' ? '3. اختر المشروب' : '3. Select Drink'}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {['Coca-Cola', 'Coca-Cola Zero', 'Sprite', 'Fanta', 'Mineral Water'].map(
                    (d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setComboDrink(d)}
                        className={`p-2 rounded-[4px] border text-center text-xs font-medium ${
                          comboDrink === d
                            ? 'border-[#D95B32] bg-[#D95B32] text-[#171717] font-bold'
                            : 'border-white/10 bg-[#1a1a1a] text-neutral-300 hover:bg-[#242424]'
                        }`}
                      >
                        {d}
                      </button>
                    )
                  )}
                </div>
              </div>
            </>
          )}

          {/* Kitchen Note for ALL items */}
          <div className="pt-4 pb-1">
            <label
              htmlFor="special-instructions"
              className="block font-bold text-white text-sm uppercase tracking-wider font-[family-name:var(--font-anton,Anton)] mb-1"
            >
              {lang === 'KU' ? 'تێبینی بۆ چێشتخانە' : lang === 'AR' ? 'ملاحظة للمطبخ' : 'Special Kitchen Request'}
            </label>
            <input
              id="special-instructions"
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={
                lang === 'KU'
                  ? 'بۆ نموونە: کڕیسپی تر، بێ پیاز، سۆس لە دەرەوە بێت...'
                  : lang === 'AR'
                  ? 'مثال: أطراف مقرمشة أكثر، بدون بصل، الصوص جانبي...'
                  : 'e.g., Extra crispy edges, allergy notes, sauce on side'
              }
              maxLength={120}
              className="w-full px-3.5 py-2.5 rounded-[4px] bg-[#101010] border border-white/15 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D95B32] transition-colors"
            />
          </div>
        </div>

        {/* Footer: Quantity and Add to Cart Action */}
        <div className="p-4 sm:px-6 bg-[#121212] border-t border-white/10 flex items-center justify-between gap-4 flex-shrink-0">
          {/* Quantity selector */}
          <div className="flex items-center gap-2 bg-[#171717] border border-white/15 rounded-[4px] p-1">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || isSoldOut}
              aria-label="Decrease quantity"
              className="w-8 h-8 rounded-[4px] flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <Minus size={15} />
            </button>
            <span className="w-6 text-center text-sm font-bold font-mono text-white">
              {isSoldOut ? 0 : quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuantity((q) => {
                  const maxAllowed = stockCount !== undefined ? Math.max(1, stockCount) : 20
                  return Math.min(maxAllowed, q + 1)
                })
              }
              disabled={isSoldOut || (stockCount !== undefined && quantity >= stockCount)}
              aria-label="Increase quantity"
              className="w-8 h-8 rounded-[4px] flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <Plus size={15} />
            </button>
          </div>

          {/* Add to Order Button */}
          <button
            type="button"
            onClick={handleAdd}
            disabled={isSoldOut}
            className={`flex-1 py-3.5 px-5 rounded-[4px] font-bold text-xs uppercase tracking-[0.5px] transition-all flex items-center justify-between shadow-lg hover:-translate-y-0.5 active:translate-y-0 ${
              isSoldOut
                ? 'bg-[#171717] text-[#888] cursor-not-allowed border border-white/20'
                : 'bg-[#D95B32] hover:bg-[#e36a43] text-[#171717]'
            }`}
          >
            <span className="flex items-center gap-1.5 font-[family-name:var(--font-anton,Anton)] text-sm">
              <Sparkles size={15} fill="currentColor" />
              {isSoldOut
                ? lang === 'KU'
                  ? 'تەواو بووە'
                  : lang === 'AR'
                  ? 'نفدت الكمية'
                  : 'Sold Out Today'
                : lang === 'KU'
                ? 'زیادکردن بۆ داواکاری'
                : lang === 'AR'
                ? 'أضف إلى الطلب'
                : 'Add To Order'}
            </span>
            <span className="font-[family-name:var(--font-anton,Anton)] text-base">
              {formatPrice(finalTotal)} <small className="text-[10px] font-sans font-normal">IQD</small>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
