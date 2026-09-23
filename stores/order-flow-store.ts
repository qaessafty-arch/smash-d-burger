'use client'

import { create } from 'zustand'
import type { BurgerItem } from '@/components/burger-customizer-modal'

interface OrderFlowState {
  // Customization state
  customizingBurger: BurgerItem | null
  setCustomizingBurger: (burger: BurgerItem | null) => void

  // Cart state
  cartItems: any[]
  setCartItems: (items: any[]) => void
  addToCart: (item: any) => void
  updateQuantity: (id: string, quantity: number) => void
  removeFromCart: (id: string) => void
  clearCart: () => void

  // Checkout state
  orderType: 'delivery' | 'pickup'
  setOrderType: (type: 'delivery' | 'pickup') => void
  customerName: string
  setCustomerName: (name: string) => void
  deliveryAddress: string
  setDeliveryAddress: (address: string) => void

  // Review state
  reviewFilter: 'All' | '5' | 'recent'
  setReviewFilter: (filter: 'All' | '5' | 'recent') => void

  // Category state
  activeCategory: string
  setActiveCategory: (category: string) => void
}

export const useOrderFlowStore = create<OrderFlowState>((set) => ({
  // Customization
  customizingBurger: null,
  setCustomizingBurger: (burger) => set({ customizingBurger: burger }),

  // Cart
  cartItems: [],
  setCartItems: (items) => set({ cartItems: items }),
  addToCart: (item) => set((state) => {
    const existingIdx = state.cartItems.findIndex(
      (it) =>
        it.burgerName === item.burgerName &&
        it.sauceLevel === item.sauceLevel &&
        it.specialInstructions === item.specialInstructions &&
        JSON.stringify((it.removedIngredients || []).slice().sort()) ===
          JSON.stringify((item.removedIngredients || []).slice().sort()) &&
        JSON.stringify((it.addedExtras || []).map((e: any) => e.id).sort()) ===
          JSON.stringify((item.addedExtras || []).map((e: any) => e.id).sort())
    )

    if (existingIdx > -1) {
      const copyList = [...state.cartItems]
      const existing = copyList[existingIdx]
      const updatedQty = existing.quantity + item.quantity
      copyList[existingIdx] = {
        ...existing,
        quantity: updatedQty,
        totalPrice: existing.totalUnitPrice * updatedQty,
      }
      return { cartItems: copyList }
    }
    return { cartItems: [...state.cartItems, item] }
  }),
  updateQuantity: (id, quantity) => set((state) => {
    if (quantity <= 0) {
      return { cartItems: state.cartItems.filter((item) => item.id !== id) }
    }
    return {
      cartItems: state.cartItems.map((item) =>
        item.id === id
          ? { ...item, quantity, totalPrice: item.totalUnitPrice * quantity }
          : item
      ),
    }
  }),
  removeFromCart: (id) => set((state) => ({
    cartItems: state.cartItems.filter((item) => item.id !== id),
  })),
  clearCart: () => set({ cartItems: [] }),

  // Checkout
  orderType: 'delivery',
  setOrderType: (type) => set({ orderType: type }),
  customerName: '',
  setCustomerName: (name) => set({ customerName: name }),
  deliveryAddress: '',
  setDeliveryAddress: (address) => set({ deliveryAddress: address }),

  // Review
  reviewFilter: 'All',
  setReviewFilter: (filter) => set({ reviewFilter: filter }),

  // Category
  activeCategory: 'Meat Burgers',
  setActiveCategory: (category) => set({ activeCategory: category }),
}))