import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/supabase'
import { redeemPointsSchema, uuidSchema } from '@/lib/validators'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user loyalty info
    const { data: userProfile } = await supabase
      .from('users')
      .select('loyalty_points, loyalty_tier, total_spent, total_orders')
      .eq('id', user.id)
      .single()

    // Get loyalty tier details
    const { data: tiers } = await supabase
      .from('loyalty_tiers')
      .select('*')
      .order('min_points', { ascending: true })

    // Get recent transactions
    const { data: transactions } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Get expiring points
    const { data: expiringPoints } = await supabase
      .from('loyalty_transactions')
      .select('points, expires_at')
      .eq('user_id', user.id)
      .gt('points', 0)
      .not('expires_at', 'is', null)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true })

    return NextResponse.json({
      data: {
        points: userProfile?.loyalty_points || 0,
        tier: userProfile?.loyalty_tier || 'bronze',
        total_spent: userProfile?.total_spent || 0,
        total_orders: userProfile?.total_orders || 0,
        tiers,
        transactions: transactions || [],
        expiring_points: expiringPoints?.reduce((sum, t) => sum + t.points, 0) || 0,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'redeem': {
        const validated = redeemPointsSchema.parse(data)

        const { data: userProfile } = await supabase
          .from('users')
          .select('loyalty_points')
          .eq('id', user.id)
          .single()

        if (!userProfile || userProfile.loyalty_points < validated.points) {
          return NextResponse.json({ error: 'Insufficient points' }, { status: 400 })
        }

        // Create transaction
        const { data, error } = await supabase
          .from('loyalty_transactions')
          .insert({
            user_id: user.id,
            points: -validated.points,
            transaction_type: 'redeemed',
            description: validated.description,
          })
          .select()
          .single()

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

        // Update user points
        await supabase
          .from('users')
          .update({ loyalty_points: userProfile.loyalty_points - validated.points })
          .eq('id', user.id)

        return NextResponse.json({ data })
      }

      case 'check-tier': {
        const { data: userProfile } = await supabase
          .from('users')
          .select('loyalty_points')
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

          // Give tier upgrade bonus
          await supabase
            .from('loyalty_transactions')
            .insert({
              user_id: user.id,
              points: 500,
              transaction_type: 'bonus',
              description: `Tier upgrade to ${newTier.name}!`,
            })

          return NextResponse.json({ tier_upgraded: true, new_tier: newTier.name })
        }

        return NextResponse.json({ tier_upgraded: false })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}