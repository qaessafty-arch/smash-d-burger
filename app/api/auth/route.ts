import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/supabase'
import { registerSchema, loginSchema, verifyOtpSchema } from '@/lib/validators'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    const supabase = createClient()

    switch (action) {
      case 'register': {
        const validated = registerSchema.parse(data)

        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('phone', validated.phone)
          .single()

        if (existingUser) {
          return NextResponse.json(
            { error: 'User with this phone number already exists' },
            { status: 400 }
          )
        }

        // Generate referral code
        const referralCode = 'SB' + Math.random().toString(36).substring(2, 8).toUpperCase()

        // Create user (password will be handled by Supabase Auth)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          phone: validated.phone,
          options: {
            data: {
              name: validated.name,
              language: validated.language,
              referral_code: referralCode,
            },
          },
        })

        if (authError) {
          return NextResponse.json(
            { error: authError.message },
            { status: 400 }
          )
        }

        // Create user profile
        const { data: user, error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user?.id,
            phone: validated.phone,
            email: validated.email,
            name: validated.name,
            language: validated.language,
            referral_code: referralCode,
            referred_by: validated.referral_code ? null : undefined,
          })
          .select()
          .single()

        if (userError) {
          return NextResponse.json(
            { error: userError.message },
            { status: 400 }
          )
        }

        // If referral code provided, give bonus points
        if (validated.referral_code) {
          const { data: referrer } = await supabase
            .from('users')
            .select('id')
            .eq('referral_code', validated.referral_code)
            .single()

          if (referrer) {
            await supabase
              .from('users')
              .update({ referred_by: referrer.id })
              .eq('id', user.id)

            // Add referral bonus to referrer
            const { data: settings } = await supabase
              .from('business_settings')
              .select('value')
              .eq('key', 'referral_bonus_points')
              .single()

            const bonusPoints = settings?.value as number || 1000

            await supabase
              .from('loyalty_transactions')
              .insert({
                user_id: referrer.id,
                points: bonusPoints,
                transaction_type: 'referral',
                description: `Referral bonus for ${validated.name}`,
              })

            await supabase.rpc('increment_loyalty_points', {
              user_id: referrer.id,
              points: bonusPoints,
            })
          }
        }

        return NextResponse.json({
          user,
          session: authData.session,
        })
      }

      case 'login': {
        const validated = loginSchema.parse(data)

        const { data: authData, error: authError } = await supabase.auth.signInWithOtp({
          phone: validated.phone,
        })

        if (authError) {
          return NextResponse.json(
            { error: authError.message },
            { status: 400 }
          )
        }

        return NextResponse.json({
          message: 'OTP sent successfully',
        })
      }

      case 'verify-otp': {
        const validated = verifyOtpSchema.parse(data)

        const { data: authData, error: authError } = await supabase.auth.verifyOtp({
          phone: validated.phone,
          token: validated.otp,
          type: 'sms',
        })

        if (authError) {
          return NextResponse.json(
            { error: authError.message },
            { status: 400 }
          )
        }

        // Get user profile
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user?.id)
          .single()

        if (userError) {
          return NextResponse.json(
            { error: userError.message },
            { status: 400 }
          )
        }

        // Update last login
        await supabase
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', user.id)

        return NextResponse.json({
          user,
          session: authData.session,
        })
      }

      case 'logout': {
        const { error } = await supabase.auth.signOut()

        if (error) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          )
        }

        return NextResponse.json({ message: 'Logged out successfully' })
      }

      case 'refresh': {
        const { data: { session }, error } = await supabase.auth.refreshSession()

        if (error) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          )
        }

        return NextResponse.json({ session })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ user: profile })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}