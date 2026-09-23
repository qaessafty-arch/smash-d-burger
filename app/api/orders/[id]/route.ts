import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/supabase'
import { updateOrderStatusSchema, uuidSchema } from '@/lib/validators'

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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = (await supabase.from('users').select('role').eq('id', user.id).single()).data?.role === 'admin'

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
      `)
      .eq('id', id)

    if (!isAdmin) {
      query = query.eq('user_id', user.id)
    }

    const { data, error } = await query.single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ data })
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
    const validated = updateOrderStatusSchema.parse(body)

    const { data: existingOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const updateData: any = {
      status: validated.status,
      updated_at: new Date().toISOString(),
    }

    // Set timestamps based on status
    const now = new Date().toISOString()
    switch (validated.status) {
      case 'confirmed':
        updateData.confirmed_at = now
        break
      case 'preparing':
        updateData.preparing_at = now
        break
      case 'ready':
        updateData.ready_at = now
        break
      case 'out_for_delivery':
        updateData.out_for_delivery_at = now
        break
      case 'delivered':
        updateData.delivered_at = now
        break
      case 'cancelled':
        updateData.cancelled_at = now
        updateData.cancellation_reason = validated.cancellation_reason
        break
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Send notification to user
    await supabase
      .from('notifications')
      .insert({
        user_id: existingOrder.user_id,
        type: 'order_status',
        title: `Order ${validated.status.charAt(0).toUpperCase() + validated.status.slice(1)}`,
        body: `Your order #${existingOrder.order_number} is now ${validated.status}.`,
        data: { order_id: id, status: validated.status },
      })

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}