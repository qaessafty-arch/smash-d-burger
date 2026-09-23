import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/supabase'
import { menuItemUpdateSchema, uuidSchema } from '@/lib/validators'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient()
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const lang = searchParams.get('lang') || 'EN'

    uuidSchema.parse(id)

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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    const transformed = {
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
      } : null,
    }

    return NextResponse.json({ data: transformed })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient()
    const { id } = await params

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

    uuidSchema.parse(id)

    const body = await request.json()
    const validated = menuItemUpdateSchema.parse(body)

    const { data, error } = await supabase
      .from('menu_items')
      .update(validated)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient()
    const { id } = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    uuidSchema.parse(id)

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Menu item deleted' })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}