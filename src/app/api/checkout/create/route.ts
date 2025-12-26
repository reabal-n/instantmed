import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createIntakeCheckout } from '@/lib/stripe/create-checkout'
import { z } from 'zod'

const createCheckoutSchema = z.object({
  intakeId: z.string().uuid(),
  isPriority: z.boolean().optional().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request
    const body = await request.json()
    const validation = createCheckoutSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { intakeId, isPriority } = validation.data

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Verify intake belongs to user
    const { data: intake } = await supabase
      .from('intakes')
      .select('id, patient_id, service_id')
      .eq('id', intakeId)
      .single()

    if (!intake || intake.patient_id !== profile.id) {
      return NextResponse.json(
        { error: 'Intake not found or not authorized' },
        { status: 404 }
      )
    }

    // Get app URL for redirects
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create checkout session
    const result = await createIntakeCheckout({
      intakeId,
      serviceId: intake.service_id,
      patientEmail: profile.email || user.email!,
      patientName: profile.full_name,
      isPriority,
      successUrl: `${appUrl}/checkout/success`,
      cancelUrl: `${appUrl}/start/review?intake=${intakeId}`,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create checkout' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      checkoutUrl: result.checkoutUrl,
      sessionId: result.sessionId,
    })
  } catch (error) {
    console.error('Create checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
