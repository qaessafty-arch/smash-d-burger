import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/supabase'

export async function GET(request: NextRequest) {
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

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    // Get stats
    const [
      { count: totalUsers },
      { count: totalOrders },
      { count: pendingOrders },
      { count: lowStockItems },
      { data: recentOrders },
      { data: topItems },
      { data: revenueData },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true })
        .lte('current_stock', supabase.raw('low_stock_threshold')),
      supabase
        .from('orders')
        .select('*, users(name, phone)')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('order_items')
        .select(`
          quantity,
          total_price,
          menu_items!inner (name_en, name_ku, name_ar, base_price)
        `)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from('orders')
        .select('total, created_at')
        .eq('status', 'delivered')
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true }),
    ])

    // Process top items
    const itemStats = new Map()
    topItems?.forEach(item => {
      const key = item.menu_items.id
      if (!itemStats.has(key)) {
        itemStats.set(key, {
          id: item.menu_items.id,
          name_en: item.menu_items.name_en,
          name_ku: item.menu_items.name_ku,
          name_ar: item.menu_items.name_ar,
          base_price: item.menu_items.base_price,
          total_sold: 0,
          total_revenue: 0,
          order_count: 0,
        })
      }
      const stat = itemStats.get(key)
      stat.total_sold += item.quantity
      stat.total_revenue += item.total_price
      stat.order_count += 1
    })

    const topSelling = Array.from(itemStats.values())
      .sort((a, b) => b.total_sold - a.total_sold)
      .slice(0, 10)

    // Process revenue by day
    const dailyRevenue = new Map()
    revenueData?.forEach(order => {
      const date = order.created_at.split('T')[0]
      if (!dailyRevenue.has(date)) {
        dailyRevenue.set(date, { date, revenue: 0, orders: 0 })
      }
      const day = dailyRevenue.get(date)
      day.revenue += order.total
      day.orders += 1
    })

    const revenueChart = Array.from(dailyRevenue.values()).sort((a, b) => a.date.localeCompare(b.date))

    // Calculate totals
    const totalRevenue = revenueData?.reduce((sum, o) => sum + o.total, 0) || 0
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0

    return NextResponse.json({
      data: {
        stats: {
          totalUsers: totalUsers || 0,
          totalOrders: totalOrders || 0,
          pendingOrders: pendingOrders || 0,
          lowStockItems: lowStockItems || 0,
          totalRevenue,
          avgOrderValue: Math.round(avgOrderValue),
        },
        recentOrders: recentOrders || [],
        topSellingItems: topSelling,
        revenueChart,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}