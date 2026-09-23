import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/supabase'
import { createReviewSchema, reviewFilterSchema } from '@/lib/validators'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)

    const params = reviewFilterSchema.parse(Object.fromEntries(searchParams))

    let query = supabase
      .from('reviews')
      .select(`
        *,
        users (
          id,
          name,
          avatar_url
        ),
        menu_items (
          name_en,
          name_ku,
          name_ar
        )
      `, { count: 'exact' })
      .eq('is_published', true)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })

    if (params.stars) {
      query = query.eq('stars', params.stars)
    }

    if (params.menu_item_id) {
      query = query.eq('menu_item_id', params.menu_item_id)
    }

    if (params.user_id) {
      query = query.eq('user_id', params.user_id)
    }

    if (params.is_verified_purchase !== undefined) {
      query = query.eq('is_verified_purchase', params.is_verified_purchase)
    }

    if (params.from) {
      query = query.gte('created_at', params.from)
    }

    if (params.to) {
      query = query.lte('created_at', params.to)
    }

    const { data, error, count } = await query.range((params.page - 1) * params.limit, params.page * params.limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      data,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / params.limit),
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
    const validated = createReviewSchema.parse(body)

    // Verify purchase if order_id provided
    let isVerifiedPurchase = false
    if (validated.order_id) {
      const { data: order } = await supabase
        .from('orders')
        .select('id, status')
        .eq('id', validated.order_id)
        .eq('user_id', user.id)
        .eq('status', 'delivered')
        .single()

      if (order) {
        isVerifiedPurchase = true
      }
    }

    // Check if user already reviewed this order
    if (validated.order_id) {
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('user_id', user.id)
        .eq('order_id', validated.order_id)
        .single()

      if (existing) {
        return NextResponse.json({ error: 'You have already reviewed this order' }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        user_id: user.id,
        order_id: validated.order_id,
        menu_item_id: validated.menu_item_id,
        stars: validated.stars,
        comment: validated.comment,
        favorite_item: validated.favorite_item,
        is_verified_purchase: isVerifiedPurchase,
        moderation_status: 'pending',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Award loyalty points for review
    const { data: settings } = await supabase
      .from('business_settings')
      .select('value')
      .eq('key', 'review_bonus_points')
      .single()

    const bonusPoints = settings?.value as number || 100

    if (bonusPoints > 0) {
      await supabase
        .from('loyalty_transactions')
        .insert({
          user_id: user.id,
          points: bonusPoints,
          transaction_type: 'bonus',
          description: 'Review bonus',
        })

      await supabase.rpc('increment_loyalty_points', {
        user_id: user.id,
        points: bonusPoints,
      })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}