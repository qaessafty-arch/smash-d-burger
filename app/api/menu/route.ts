import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/supabase'
import { menuItemSchema, categorySchema, paginationSchema } from '@/lib/validators'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const categoryId = searchParams.get('category_id')
    const activeOnly = searchParams.get('active_only') !== 'false'
    const lang = searchParams.get('lang') || 'EN'

    // Build query
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
      `, { count: 'exact' })
      .order('display_order', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data, error, count } = await query.range((page - 1) * limit, page * limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Transform data to include localized fields and stock status
    const transformed = data?.map(item => ({
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
      } : null,
    }))

    return NextResponse.json({
      data: transformed,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
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

    // Check admin authorization
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

    const body = await request.json()
    const validated = menuItemSchema.parse(body)

    const { data, error } = await supabase
      .from('menu_items')
      .insert(validated)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Create inventory entry
    await supabase
      .from('inventory_items')
      .insert({
        menu_item_id: data.id,
        current_stock: 20,
        low_stock_threshold: 5,
      })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}