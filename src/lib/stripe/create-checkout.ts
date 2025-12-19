import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { enforceConsents } from '@/lib/consent/validate'
import { env } from '@/lib/env'

// ============================================
// STRIPE CHECKOUT SESSION CREATION
// ============================================

const stripe = new Stripe(env.stripeSecretKey, {
  apiVersion: '2024-12-18.acacia',
})

export interface CreateCheckoutParams {
  intakeId: string
  serviceId: string
  patientEmail: string
  patientName: string
  isPriority?: boolean
  successUrl: string
  cancelUrl: string
}

export interface CheckoutResult {
  success: boolean
  checkoutUrl?: string
  sessionId?: string
  error?: string
}

/**
 * Create a Stripe Checkout session tied to a draft intake
 */
export async function createIntakeCheckout(
  params: CreateCheckoutParams
): Promise<CheckoutResult> {
  const supabase = await createClient()

  try {
    // 1. Verify the intake exists and is in draft/pending_payment status
    const { data: intake, error: intakeError } = await supabase
      .from('intakes')
      .select(`
        id,
        status,
        service_id,
        patient_id,
        is_priority,
        services (
          id,
          name,
          price_cents,
          priority_fee_cents,
          type
        )
      `)
      .eq('id', params.intakeId)
      .single()

    if (intakeError || !intake) {
      return { success: false, error: 'Intake not found' }
    }

    if (!['draft', 'pending_payment'].includes(intake.status)) {
      return { success: false, error: 'Intake is not in a payable state' }
    }

    const service = intake.services as unknown as {
      id: string
      name: string
      price_cents: number
      priority_fee_cents: number
      type: string
    }

    // 2. Enforce all required consents have been given
    try {
      await enforceConsents(params.intakeId, service.type)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Consent validation failed',
      }
    }

    // 3. Calculate total amount
    const basePrice = service.price_cents
    const priorityFee = params.isPriority ? service.priority_fee_cents : 0
    const totalAmount = basePrice + priorityFee

    // 4. Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: 'aud',
          product_data: {
            name: service.name,
            description: 'Online consultation with Australian-registered doctor',
          },
          unit_amount: basePrice,
        },
        quantity: 1,
      },
    ]

    if (params.isPriority && priorityFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'aud',
          product_data: {
            name: 'Priority Processing',
            description: 'Fast-track your request to the front of the queue',
          },
          unit_amount: priorityFee,
        },
        quantity: 1,
      })
    }

    // 5. Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', intake.patient_id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: params.patientEmail,
        name: params.patientName,
        metadata: {
          patient_id: intake.patient_id,
        },
      })
      customerId = customer.id

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', intake.patient_id)
    }

    // 6. Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : params.patientEmail,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: params.cancelUrl,
      metadata: {
        intake_id: params.intakeId,
        patient_id: intake.patient_id,
        service_id: service.id,
        is_priority: params.isPriority ? 'true' : 'false',
      },
      payment_intent_data: {
        metadata: {
          intake_id: params.intakeId,
          patient_id: intake.patient_id,
          service_id: service.id,
        },
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min expiry
    })

    // 7. Update intake with payment info and status
    await supabase
      .from('intakes')
      .update({
        status: 'pending_payment',
        payment_id: session.payment_intent as string,
        amount_cents: totalAmount,
        is_priority: params.isPriority || false,
      })
      .eq('id', params.intakeId)

    return {
      success: true,
      checkoutUrl: session.url!,
      sessionId: session.id,
    }
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create checkout',
    }
  }
}

/**
 * Verify a checkout session completed successfully
 */
export async function verifyCheckoutSession(sessionId: string): Promise<{
  success: boolean
  intakeId?: string
  error?: string
}> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return { success: false, error: 'Payment not completed' }
    }

    return {
      success: true,
      intakeId: session.metadata?.intake_id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify session',
    }
  }
}
