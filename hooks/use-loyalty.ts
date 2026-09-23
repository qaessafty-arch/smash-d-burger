'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/db/supabase'

const supabase = createClient()

export function useLoyalty() {
  return useQuery({
    queryKey: ['loyalty'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const [{ data: userProfile }, { data: tiers }, { data: transactions }, { data: expiringPoints }] = await Promise.all([
        supabase.from('users').select('loyalty_points, loyalty_tier, total_spent, total_orders').eq('id', user.id).single(),
        supabase.from('loyalty_tiers').select('*').order('min_points', { ascending: true }),
        supabase.from('loyalty_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('loyalty_transactions').select('points, expires_at').eq('user_id', user.id).gt('points', 0).not('expires_at', 'is', null).gt('expires_at', new Date().toISOString()).order('expires_at', { ascending: true }),
      ])

      return {
        points: userProfile?.loyalty_points || 0,
        tier: userProfile?.loyalty_tier || 'bronze',
        total_spent: userProfile?.total_spent || 0,
        total_orders: userProfile?.total_orders || 0,
        tiers: tiers || [],
        transactions: transactions || [],
        expiring_points: expiringPoints?.reduce((sum, t) => sum + t.points, 0) || 0,
      }
    },
    staleTime: 60 * 1000,
  })
}

export function useRedeemPoints() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ points, description }: { points: number; description: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userProfile } = await supabase
        .from('users')
        .select('loyalty_points')
        .eq('id', user.id)
        .single()

      if (!userProfile || userProfile.loyalty_points < points) {
        throw new Error('Insufficient points')
      }

      const { data, error } = await supabase
        .from('loyalty_transactions')
        .insert({
          user_id: user.id,
          points: -points,
          transaction_type: 'redeemed',
          description,
        })
        .select()
        .single()

      if (error) throw error

      await supabase
        .from('users')
        .update({ loyalty_points: userProfile.loyalty_points - points })
        .eq('id', user.id)

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty'] })
    },
  })
}

export function useCheckTierUpgrade() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userProfile } = await supabase
        .from('users')
        .select('loyalty_points, loyalty_tier')
        .eq('id', user.id)
        .single()

      const { data: newTier } = await supabase
        .from('loyalty_tiers')
        .select('name')
        .lte('min_points', userProfile?.loyalty_points || 0)
        .order('min_points', { ascending: false })
        .limit(1)
        .single()

      if (newTier && newTier.name !== userProfile?.loyalty_tier) {
        await supabase
          .from('users')
          .update({ loyalty_tier: newTier.name })
          .eq('id', user.id)

        await supabase
          .from('loyalty_transactions')
          .insert({
            user_id: user.id,
            points: 500,
            transaction_type: 'bonus',
            description: `Tier upgrade to ${newTier.name}!`,
          })

        return { tier_upgraded: true, new_tier: newTier.name }
      }

      return { tier_upgraded: false }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty'] })
    },
  })
}