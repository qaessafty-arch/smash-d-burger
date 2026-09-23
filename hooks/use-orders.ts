'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/db/supabase'
import type { Order } from '@/lib/db/types'

const supabase = createClient()

export function useOrders(params?: {
  status?: string
  order_type?: string
  page?: number
  limit?: number
  from?: string
  to?: string
}) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_items (name_en, name_ku, name_ar, image_url)
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

      if (params?.status) {
        query = query.eq('status', params.status)
      }
      if (params?.order_type) {
        query = query.eq('order_type', params.order_type)
      }
      if (params?.from) {
        query = query.gte('created_at', params.from)
      }
      if (params?.to) {
        query = query.lte('created_at', params.to)
      }

      const page = params?.page || 1
      const limit = params?.limit || 20
      query = query.range((page - 1) * limit, page * limit - 1)

      const { data, error, count } = await query

      if (error) throw error

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }
    },
    staleTime: 30 * 1000,
  })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_items (name_en, name_ku, name_ar, image_url)
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      return data
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderData: {
      order_type: 'delivery' | 'pickup'
      customer_name: string
      customer_phone: string
      delivery_address?: any
      pickup_location?: string
      special_instructions?: string
      loyalty_points_to_use?: number
      payment_method?: 'cash' | 'card' | 'wallet' | 'whatsapp'
      cart_items: Array<{
        menu_item_id: string
        quantity: number
        removed_ingredients: string[]
        added_extras: Array<{ id: string; name: string; price: number }>
        sauce_level?: string
        special_instructions?: string
      }>
    }) => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to create order')
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}

export function useReorder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: order } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            menu_item_id,
            quantity,
            removed_ingredients,
            added_extras,
            sauce_level,
            special_instructions
          )
        `)
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single()

      if (!order) throw new Error('Order not found')

      const cartItems = order.order_items.map(item => ({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        removed_ingredients: item.removed_ingredients,
        added_extras: item.added_extras,
        sauce_level: item.sauce_level,
        special_instructions: item.special_instructions,
      }))

      for (const cartItem of cartItems) {
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
            await supabase
              .from('cart_items')
              .update({
                quantity: existing.quantity + cartItem.quantity,
                total_price: existing.unit_price * (existing.quantity + cartItem.quantity),
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id)
            continue
          }
        }

        const { data: menuItem } = await supabase
          .from('menu_items')
          .select('base_price')
          .eq('id', cartItem.menu_item_id)
          .single()

        const extrasPrice = cartItem.added_extras.reduce((sum, e) => sum + e.price, 0)
        const unitPrice = (menuItem?.base_price || 0) + extrasPrice
        const totalPrice = unitPrice * cartItem.quantity

        await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            ...cartItem,
            unit_price: unitPrice,
            total_price: totalPrice,
          })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}