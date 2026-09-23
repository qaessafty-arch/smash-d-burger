'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/db/supabase'
import type { MenuItem, Category } from '@/lib/db/types'

const supabase = createClient()

export function useCategories(lang: 'EN' | 'KU' | 'AR' = 'EN') {
  return useQuery({
    queryKey: ['categories', lang],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) throw error

      return data?.map(cat => ({
        ...cat,
        name: cat[`name_${lang.toLowerCase()}`],
        description: cat[`description_${lang.toLowerCase()}`],
      })) || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useMenuItems(
  categoryId?: string,
  lang: 'EN' | 'KU' | 'AR' = 'EN',
  activeOnly = true
) {
  return useQuery({
    queryKey: ['menuItems', categoryId, lang, activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('menu_items')
        .select(`
          *,
          categories!inner (
            id,
            name_en,
            name_ku,
            name_ar
          ),
          inventory_items (
            current_stock,
            low_stock_threshold
          )
        `)
        .order('display_order', { ascending: true })

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }

      const { data, error } = await query

      if (error) throw error

      return data?.map(item => ({
        ...item,
        name: item[`name_${lang.toLowerCase()}`],
        description: item[`description_${lang.toLowerCase()}`],
        badge: item[`badge_${lang.toLowerCase()}`],
        category: item.categories ? {
          id: item.categories.id,
          name: item.categories[`name_${lang.toLowerCase()}`],
        } : null,
        stock: item.inventory_items?.[0] ? {
          current: item.inventory_items[0].current_stock,
          low_threshold: item.inventory_items[0].low_stock_threshold,
          status: item.inventory_items[0].current_stock <= 0 ? 'sold_out' :
                  item.inventory_items[0].current_stock <= item.inventory_items[0].low_stock_threshold ? 'low_stock' :
                  item.inventory_items[0].current_stock <= item.inventory_items[0].low_stock_threshold * 2 ? 'limited' : 'in_stock'
        } : { current: 99, low_threshold: 5, status: 'in_stock' as const },
      })) || []
    },
    staleTime: 60 * 1000,
    enabled: true,
  })
}

export function useMenuItem(id: string, lang: 'EN' | 'KU' | 'AR' = 'EN') {
  return useQuery({
    queryKey: ['menuItem', id, lang],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          *,
          categories!inner (
            id,
            name_en,
            name_ku,
            name_ar
          ),
          inventory_items (
            current_stock,
            low_stock_threshold
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      return {
        ...data,
        name: data[`name_${lang.toLowerCase()}`],
        description: data[`description_${lang.toLowerCase()}`],
        badge: data[`badge_${lang.toLowerCase()}`],
        category: data.categories ? {
          id: data.categories.id,
          name: data.categories[`name_${lang.toLowerCase()}`],
        } : null,
        stock: data.inventory_items?.[0] ? {
          current: data.inventory_items[0].current_stock,
          low_threshold: data.inventory_items[0].low_stock_threshold,
          status: data.inventory_items[0].current_stock <= 0 ? 'sold_out' :
                  data.inventory_items[0].current_stock <= data.inventory_items[0].low_stock_threshold ? 'low_stock' :
                  data.inventory_items[0].current_stock <= data.inventory_items[0].low_stock_threshold * 2 ? 'limited' : 'in_stock'
        } : { current: 99, low_threshold: 5, status: 'in_stock' as const },
      }
    },
    staleTime: 60 * 1000,
    enabled: !!id,
  })
}

export function useFeaturedItems(lang: 'EN' | 'KU' | 'AR' = 'EN') {
  return useQuery({
    queryKey: ['featuredItems', lang],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          *,
          categories!inner (
            id,
            name_en,
            name_ku,
            name_ar
          ),
          inventory_items (
            current_stock,
            low_stock_threshold
          )
        `)
        .eq('is_active', true)
        .not('badge_en', 'is', null)
        .limit(4)

      if (error) throw error

      return data?.map(item => ({
        ...item,
        name: item[`name_${lang.toLowerCase()}`],
        description: item[`description_${lang.toLowerCase()}`],
        badge: item[`badge_${lang.toLowerCase()}`],
        category: item.categories ? {
          id: item.categories.id,
          name: item.categories[`name_${lang.toLowerCase()}`],
        } : null,
        stock: item.inventory_items?.[0] ? {
          current: item.inventory_items[0].current_stock,
          low_threshold: item.inventory_items[0].low_stock_threshold,
          status: item.inventory_items[0].current_stock <= 0 ? 'sold_out' :
                  item.inventory_items[0].current_stock <= item.inventory_items[0].low_stock_threshold ? 'low_stock' :
                  item.inventory_items[0].current_stock <= item.inventory_items[0].low_stock_threshold * 2 ? 'limited' : 'in_stock'
        } : { current: 99, low_threshold: 5, status: 'in_stock' as const },
      })) || []
    },
    staleTime: 5 * 60 * 1000,
  })
}