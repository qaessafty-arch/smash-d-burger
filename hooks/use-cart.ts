'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/db/supabase'
import type { CartItem } from '@/lib/db/types'

const supabase = createClient()

export function useCart() {
  return useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          menu_items (
            id,
            name_en,
            name_ku,
            name_ar,
            description_en,
            description_ku,
            description_ar,
            base_price,
            image_url,
            badge_en,
            badge_ku,
            badge_ar,
            is_spicy,
            is_active,
            category_id,
            categories (
              name_en,
              name_ku,
              name_ar
            )
          ),
          inventory_items (
            current_stock,
            low_stock_threshold
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data?.map(item => {
        const menuItem = item.menu_items
        const inventory = item.inventory_items?.[0]
        return {
          ...item,
          menu_item: menuItem ? {
            ...menuItem,
            name: menuItem.name_en,
            description: menuItem.description_en,
            badge: menuItem.badge_en,
            category: menuItem.categories ? {
              name: menuItem.categories.name_en,
            } : null,
            stock: inventory ? {
              current: inventory.current_stock,
              low_threshold: inventory.low_stock_threshold,
              status: inventory.current_stock <= 0 ? 'sold_out' :
                      inventory.current_stock <= inventory.low_stock_threshold ? 'low_stock' :
                      inventory.current_stock <= inventory.low_stock_threshold * 2 ? 'limited' : 'in_stock'
            } : { current: 99, low_threshold: 5, status: 'in_stock' as const },
          } : null,
        }
      }) || []
    },
    staleTime: 30 * 1000,
  })
}

export function useCartSummary() {
  return useQuery({
    queryKey: ['cart', 'summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cart_items')
        .select('quantity, total_price')
        .order('created_at', { ascending: false })

      if (error) throw error

      const subtotal = data?.reduce((sum, item) => sum + item.total_price, 0) || 0
      const totalItems = data?.reduce((sum, item) => sum + item.quantity, 0) || 0

      return { subtotal, totalItems, itemCount: data?.length || 0 }
    },
    staleTime: 30 * 1000,
  })
}

export function useAddToCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (cartItem: Omit<CartItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check if item already exists with same customization
      const { data: existing } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('menu_item_id', cartItem.menu_item_id)
        .single()

      if (existing) {
        const sameCustomization =
          JSON.stringify(existing.removed_ingredients.sort()) === JSON.stringify(cartItem.removed_ingredients.sort()) &&
          JSON.stringify(existing.added_extras.map((e: any) => e.id).sort()) === JSON.stringify(cartItem.added_extras.map((e: any) => e.id).sort()) &&
          existing.sauce_level === cartItem.sauce_level

        if (sameCustomization) {
          const newQuantity = existing.quantity + cartItem.quantity
          const { data, error } = await supabase
            .from('cart_items')
            .update({
              quantity: newQuantity,
              total_price: existing.unit_price * newQuantity,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single()

          if (error) throw error
          return data
        }
      }

      // Check inventory
      const { data: inventory } = await supabase
        .from('inventory_items')
        .select('current_stock')
        .eq('menu_item_id', cartItem.menu_item_id)
        .single()

      const availableStock = inventory?.current_stock || 99
      if (availableStock < cartItem.quantity) {
        throw new Error(`Only ${availableStock} available`)
      }

      // Get menu item price
      const { data: menuItem } = await supabase
        .from('menu_items')
        .select('base_price')
        .eq('id', cartItem.menu_item_id)
        .single()

      const extrasPrice = cartItem.added_extras.reduce((sum, e) => sum + e.price, 0)
      const unitPrice = (menuItem?.base_price || 0) + extrasPrice
      const totalPrice = unitPrice * cartItem.quantity

      const { data, error } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          ...cartItem,
          unit_price: unitPrice,
          total_price: totalPrice,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      if (quantity <= 0) {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('id', itemId)
        if (error) throw error
        return { deleted: true }
      }

      const { data: cartItem } = await supabase
        .from('cart_items')
        .select('menu_item_id, unit_price')
        .eq('id', itemId)
        .single()

      if (!cartItem) throw new Error('Cart item not found')

      const { data: inventory } = await supabase
        .from('inventory_items')
        .select('current_stock')
        .eq('menu_item_id', cartItem.menu_item_id)
        .single()

      const availableStock = inventory?.current_stock || 99
      if (availableStock < quantity) {
        throw new Error(`Only ${availableStock} available`)
      }

      const { data, error } = await supabase
        .from('cart_items')
        .update({
          quantity,
          total_price: cartItem.unit_price * quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}

export function useClearCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}