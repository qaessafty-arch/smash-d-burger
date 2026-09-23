import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/supabase'
import { orderFilterSchema } from '@/lib/validators'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'staff'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const params = orderFilterSchema.parse(Object.fromEntries(searchParams))

    let query = supabase
      .from('orders')
      .select(`
        *,
        users (id, name, phone, email),
        order_items (
          quantity,
          total_price,
          menu_items (name_en, name_ku, name_ar)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (params.user_id) {
      query = query.eq('user_id', params.user_id)
    }
    if (params.status) {
      query = query.eq('status', params.status)
    }
    if (params.order_type) {
      query = query.eq('order_type', params.order_type)
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