import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/supabase'
import { inventoryItemSchema, inventoryAdjustmentSchema, uuidSchema } from '@/lib/validators'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const lowStockOnly = searchParams.get('low_stock_only') === 'true'

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

    let query = supabase
      .from('inventory_items')
      .select(`
        *,
        menu_items (
          id,
          name_en,
          name_ku,
          name_ar,
          image_url
        )
      `)
      .order('current_stock', { ascending: true })

    if (lowStockOnly) {
      query = query.lte('current_stock', supabase.raw('low_stock_threshold'))
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const transformed = data?.map(item => ({
      ...item,
      menu_item: item.menu_items,
      stock_status: item.current_stock <= 0 ? 'sold_out' :
                   item.current_stock <= item.low_stock_threshold ? 'low_stock' :
                   item.current_stock <= item.low_stock_threshold * 2 ? 'limited' : 'in_stock',
    }))

    return NextResponse.json({ data: transformed })
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

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'staff'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validated = inventoryAdjustmentSchema.parse(body)

    // Get current inventory
    const { data: inventory } = await supabase
      .from('inventory_items')
      .select('current_stock, menu_item_id')
      .eq('id', validated.inventory_item_id)
      .single()

    if (!inventory) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    const previousStock = inventory.current_stock
    const newStock = Math.max(0, previousStock + validated.quantity_change)

    // Update inventory
    const { data, error } = await supabase
      .from('inventory_items')
      .update({
        current_stock: newStock,
        last_restocked_at: validated.adjustment_type === 'restock' ? new Date().toISOString() : null,
        last_restocked_by: validated.adjustment_type === 'restock' ? user.id : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.inventory_item_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Log adjustment
    await supabase
      .from('inventory_adjustments')
      .insert({
        inventory_item_id: validated.inventory_item_id,
        adjustment_type: validated.adjustment_type,
        quantity_change: validated.quantity_change,
        previous_stock: previousStock,
        new_stock: newStock,
        reason: validated.reason,
        reference_id: validated.reference_id,
        reference_type: validated.reference_type,
        adjusted_by: user.id,
      })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}