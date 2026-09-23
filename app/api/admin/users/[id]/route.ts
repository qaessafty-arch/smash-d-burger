import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/supabase'
import { uuidSchema } from '@/lib/validators'

export async function PATCH(
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

    const body = await request.json()
    const { role, is_active, email, language, name } = body

    const updateData: any = { updated_at: new Date().toISOString() }
    if (role) updateData.role = role
    if (typeof is_active === 'boolean') updateData.is_active = is_active
    if (email !== undefined) updateData.email = email
    if (language) updateData.language = language
    if (name) updateData.name = name

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
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