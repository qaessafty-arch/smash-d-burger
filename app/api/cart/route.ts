import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/supabase'
import { cartItemSchema, updateCartItemSchema, uuidSchema } from '@/lib/validators'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Transform with localized fields and stock
    const transformed = data?.map(item => {
      const menuItem = item.menu_items
      const inventory = item.inventory_items?.[0]
      return {
        ...item,
        menu_item: menuItem ? {
          ...menuItem,
          name: menuItem[`name_${lang.toLowerCase()}`] || menuItem.name_en,
          description: menuItem[`description_${lang.toLowerCase()}`] || menuItem.description_en,
          badge: menuItem[`badge_${lang.toLowerCase()}`] || menuItem.badge_en,
          category: menuItem.categories ? {
            name: menuItem.categories[`name_${lang.toLowerCase()}`] || menuItem.categories.name_en,
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
    })

    const subtotal = transformed?.reduce((sum, item) => sum + item.total_price, 0) || 0
    const totalItems = transformed?.reduce((sum, item) => sum + item.quantity, 0) || 0

    return NextResponse.json({
      data: transformed,
      summary: { subtotal, totalItems, itemCount: transformed?.length || 0 },
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
    const validated = cartItemSchema.parse(body)

    // Check if item already exists in cart with same customization
    const { data: existing } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('menu_item_id', validated.menu_item_id)
      .single()

    if (existing) {
      // Check if customization matches
      const sameCustomization =
        JSON.stringify(existing.removed_ingredients.sort()) === JSON.stringify(validated.removed_ingredients.sort()) &&
        JSON.stringify(existing.added_extras.map((e: any) => e.id).sort()) === JSON.stringify(validated.added_extras.map((e: any) => e.id).sort()) &&
        existing.sauce_level === validated.sauce_level

      if (sameCustomization) {
        const newQuantity = existing.quantity + validated.quantity
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

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ data })
      }
    }

    // Validate menu item exists and is active
    const { data: menuItem, error: menuError } = await supabase
      .from('menu_items')
      .select('id, base_price, is_active')
      .eq('id', validated.menu_item_id)
      .single()

    if (menuError || !menuItem || !menuItem.is_active) {
      return NextResponse.json({ error: 'Menu item not found or unavailable' }, { status: 400 })
    }

    // Check inventory
    const { data: inventory } = await supabase
      .from('inventory_items')
      .select('current_stock')
      .eq('menu_item_id', validated.menu_item_id)
      .single()

    const availableStock = inventory?.current_stock || 99
    if (availableStock < validated.quantity) {
      return NextResponse.json({ error: `Only ${availableStock} available` }, { status: 400 })
    }

    // Calculate prices
    const extrasPrice = validated.added_extras.reduce((sum, e) => sum + e.price, 0)
    const unitPrice = menuItem.base_price + extrasPrice
    const totalPrice = unitPrice * validated.quantity

    const { data, error } = await supabase
      .from('cart_items')
      .insert({
        user_id: user.id,
        menu_item_id: validated.menu_item_id,
        quantity: validated.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        removed_ingredients: validated.removed_ingredients,
        added_extras: validated.added_extras,
        sauce_level: validated.sauce_level,
        special_instructions: validated.special_instructions,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('item_id')

    if (itemId) {
      uuidSchema.parse(itemId)
      await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id)
    } else {
      // Clear entire cart
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
    }

    return NextResponse.json({ message: 'Cart cleared' })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { item_id, quantity } = body

    if (!item_id || typeof quantity !== 'number') {
      return NextResponse.json({ error: 'item_id and quantity required' }, { status: 400 })
    }

    uuidSchema.parse(item_id)

    if (quantity <= 0) {
      await supabase
        .from('cart_items')
        .delete()
        .eq('id', item_id)
        .eq('user_id', user.id)
      return NextResponse.json({ message: 'Item removed' })
    }

    // Check inventory
    const { data: cartItem } = await supabase
      .from('cart_items')
      .select('menu_item_id')
      .eq('id', item_id)
      .eq('user_id', user.id)
      .single()

    if (!cartItem) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 })
    }

    const { data: inventory } = await supabase
      .from('inventory_items')
      .select('current_stock')
      .eq('menu_item_id', cartItem.menu_item_id)
      .single()

    const availableStock = inventory?.current_stock || 99
    if (availableStock < quantity) {
      return NextResponse.json({ error: `Only ${availableStock} available` }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('cart_items')
      .update({
        quantity,
        total_price: cartItem.unit_price * quantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item_id)
      .eq('user_id', user.id)
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