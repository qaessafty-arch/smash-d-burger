import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/supabase'
import { createOrderSchema, orderFilterSchema } from '@/lib/validators'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = (await supabase.from('users').select('role').eq('id', user.id).single()).data?.role === 'admin'

    const params = orderFilterSchema.parse(Object.fromEntries(searchParams))

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu_items (
            name_en,
            name_ku,
            name_ar,
            image_url
          )
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (!isAdmin) {
      query = query.eq('user_id', user.id)
    } else if (params.user_id) {
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

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createOrderSchema.parse(body)

    // Validate cart items and check stock
    const menuItemIds = validated.cart_items.map(item => item.menu_item_id)
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('id, base_price, is_active')
      .in('id', menuItemIds)

    if (!menuItems || menuItems.length !== menuItemIds.length) {
      return NextResponse.json({ error: 'Some menu items not found' }, { status: 400 })
    }

    const inactiveItems = menuItems.filter(item => !item.is_active)
    if (inactiveItems.length > 0) {
      return NextResponse.json({ error: 'Some items are no longer available' }, { status: 400 })
    }

    // Check inventory
    const { data: inventory } = await supabase
      .from('inventory_items')
      .select('menu_item_id, current_stock')
      .in('menu_item_id', menuItemIds)

    const stockMap = new Map(inventory?.map(i => [i.menu_item_id, i.current_stock]) || [])
    for (const cartItem of validated.cart_items) {
      const stock = stockMap.get(cartItem.menu_item_id) || 0
      if (stock < cartItem.quantity) {
        return NextResponse.json({
          error: `Insufficient stock for item. Available: ${stock}`,
        }, { status: 400 })
      }
    }

    // Calculate totals
    const subtotal = validated.cart_items.reduce((sum, item) => sum + item.total_price, 0)
    const deliveryFee = validated.order_type === 'delivery' ? 2000 : 0

    // Apply loyalty points
    const { data: userProfile } = await supabase
      .from('users')
      .select('loyalty_points')
      .eq('id', user.id)
      .single()

    const maxPointsUsable = Math.floor(subtotal * 0.5) // Max 50% of subtotal
    const pointsToUse = Math.min(validated.loyalty_points_to_use, userProfile?.loyalty_points || 0, maxPointsUsable)
    const discountAmount = pointsToUse // 1 point = 1 IQD

    const total = subtotal + deliveryFee - discountAmount
    const pointsEarned = Math.floor(total * 1) // 1 point per IQD

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        order_type: validated.order_type,
        subtotal,
        delivery_fee: deliveryFee,
        discount_amount: discountAmount,
        loyalty_points_used: pointsToUse,
        loyalty_points_earned: pointsEarned,
        total,
        customer_name: validated.customer_name,
        customer_phone: validated.customer_phone,
        delivery_address: validated.delivery_address,
        pickup_location: validated.pickup_location,
        special_instructions: validated.special_instructions,
        payment_method: validated.payment_method,
        status: 'pending',
      })
      .select()
      .single()

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 400 })
    }

    // Create order items
    const orderItems = validated.cart_items.map(item => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      name_snapshot_en: '', // Will be filled from menu_items
      name_snapshot_ku: '',
      name_snapshot_ar: '',
      unit_price: item.unit_price,
      quantity: item.quantity,
      total_price: item.total_price,
      removed_ingredients: item.removed_ingredients,
      added_extras: item.added_extras,
      sauce_level: item.sauce_level,
      special_instructions: item.special_instructions,
    }))

    // Get menu item names for snapshots
    const menuItemMap = new Map(menuItems.map(m => [m.id, m]))
    orderItems.forEach(item => {
      const menuItem = menuItemMap.get(item.menu_item_id)
      if (menuItem) {
        item.name_snapshot_en = menuItem.name_en
        item.name_snapshot_ku = menuItem.name_ku
        item.name_snapshot_ar = menuItem.name_ar
      }
    })

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 400 })
    }

    // Clear cart
    await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id)

    // Deduct loyalty points if used
    if (pointsToUse > 0) {
      await supabase
        .from('loyalty_transactions')
        .insert({
          user_id: user.id,
          order_id: order.id,
          points: -pointsToUse,
          transaction_type: 'redeemed',
          description: `Redeemed for order ${order.order_number}`,
        })
    }

    // Build WhatsApp message
    const whatsappUrl = buildWhatsAppUrl(order, orderItems)

    return NextResponse.json({
      order,
      whatsapp_url: whatsappUrl,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

function buildWhatsAppUrl(order: any, items: any[]) {
  const lines = [
    '🔥 *NEW SMASHED BURGER ORDER* 🔥',
    '--------------------------------',
    `Order #: ${order.order_number}`,
    `Type: ${order.order_type === 'delivery' ? '🛵 Delivery' : '🛍️ Pickup'}`,
    `Customer: ${order.customer_name}`,
    `Phone: ${order.customer_phone}`,
  ]

  if (order.order_type === 'delivery' && order.delivery_address) {
    lines.push(`Address: ${order.delivery_address.street}, ${order.delivery_address.neighborhood}`)
    if (order.delivery_address.building) lines.push(`Building: ${order.delivery_address.building}`)
    if (order.delivery_address.floor) lines.push(`Floor: ${order.delivery_address.floor}`)
    if (order.delivery_address.apartment) lines.push(`Apt: ${order.delivery_address.apartment}`)
    if (order.delivery_address.instructions) lines.push(`Instructions: ${order.delivery_address.instructions}`)
  }

  lines.push('--------------------------------')
  lines.push('*Items:*')

  items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.quantity}x ${item.name_snapshot_en} - ${item.total_price.toLocaleString()} IQD`)
    if (item.removed_ingredients.length > 0) {
      lines.push(`   • No: ${item.removed_ingredients.join(', ')}`)
    }
    if (item.added_extras.length > 0) {
      lines.push(`   • Extras: ${item.added_extras.map((e: any) => e.name).join(', ')}`)
    }
    if (item.sauce_level && item.sauce_level !== 'Normal') {
      lines.push(`   • Sauce: ${item.sauce_level}`)
    }
    if (item.special_instructions) {
      lines.push(`   • Note: ${item.special_instructions}`)
    }
  })

  lines.push('--------------------------------')
  lines.push(`Subtotal: ${order.subtotal.toLocaleString()} IQD`)
  if (order.delivery_fee > 0) {
    lines.push(`Delivery: ${order.delivery_fee.toLocaleString()} IQD`)
  }
  if (order.discount_amount > 0) {
    lines.push(`Loyalty Discount: -${order.discount_amount.toLocaleString()} IQD`)
  }
  lines.push(`💰 *Total: ${order.total.toLocaleString()} IQD*`)

  const message = encodeURIComponent(lines.join('\n'))
  return `https://wa.me/9647500000000?text=${message}`
}