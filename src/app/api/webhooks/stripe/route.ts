import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

// ============================================
// STRIPE WEBHOOK HANDLER
// ============================================

const stripe = new Stripe(env.stripeSecretKey, {
  apiVersion: '2024-12-18.acacia',
})

// Use service role for webhook (no user context)
const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.stripeWebhookSecret
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle successful checkout session
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const intakeId = session.metadata?.intake_id
  const isPriority = session.metadata?.is_priority === 'true'

  if (!intakeId) {
    console.error('No intake_id in checkout session metadata')
    return
  }

  // Check for idempotency (prevent duplicate processing)
  const { data: existing } = await supabase
    .from('intakes')
    .select('status, paid_at')
    .eq('id', intakeId)
    .single()

  if (existing?.paid_at) {
    console.log(`Intake ${intakeId} already marked as paid, skipping`)
    return
  }

  // Get service for SLA calculation
  const { data: intake } = await supabase
    .from('intakes')
    .select(`
      id,
      patient_id,
      service_id,
      services (
        sla_standard_minutes,
        sla_priority_minutes
      )
    `)
    .eq('id', intakeId)
    .single()

  if (!intake) {
    console.error(`Intake ${intakeId} not found`)
    return
  }

  const service = intake.services as unknown as {
    sla_standard_minutes: number
    sla_priority_minutes: number
  }

  // Calculate SLA deadline
  const slaMinutes = isPriority
    ? service.sla_priority_minutes
    : service.sla_standard_minutes
  const slaDeadline = new Date(Date.now() + slaMinutes * 60 * 1000)

  // Update intake to PAID/SUBMITTED status
  const { error: updateError } = await supabase
    .from('intakes')
    .update({
      status: 'paid',
      payment_status: 'paid',
      payment_id: session.payment_intent as string,
      paid_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      sla_deadline: slaDeadline.toISOString(),
      is_priority: isPriority,
    })
    .eq('id', intakeId)

  if (updateError) {
    console.error('Failed to update intake:', updateError)
    throw updateError
  }

  // Log audit event
  await supabase.rpc('log_audit_event', {
    p_event_type: 'payment_received',
    p_description: `Payment received via Stripe. SLA deadline: ${slaDeadline.toISOString()}`,
    p_intake_id: intakeId,
    p_profile_id: intake.patient_id,
    p_actor_type: 'webhook',
    p_metadata: {
      stripe_session_id: session.id,
      payment_intent: session.payment_intent,
      amount: session.amount_total,
      is_priority: isPriority,
      sla_minutes: slaMinutes,
    },
  })

  // Log submission event
  await supabase.rpc('log_audit_event', {
    p_event_type: 'intake_submitted',
    p_description: 'Intake submitted and entered doctor queue',
    p_intake_id: intakeId,
    p_profile_id: intake.patient_id,
    p_actor_type: 'system',
    p_new_state: { status: 'paid', sla_deadline: slaDeadline.toISOString() },
  })

  // Send confirmation email (fire and forget)
  sendConfirmationEmail(intakeId, intake.patient_id).catch(console.error)

  console.log(`Intake ${intakeId} marked as paid with SLA deadline ${slaDeadline}`)
}

/**
 * Handle successful payment intent (backup handler)
 */
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const intakeId = paymentIntent.metadata?.intake_id

  if (!intakeId) {
    return // Not an intake payment
  }

  // Check if already processed
  const { data: intake } = await supabase
    .from('intakes')
    .select('status, paid_at')
    .eq('id', intakeId)
    .single()

  if (intake?.paid_at) {
    return // Already processed
  }

  // If checkout.session.completed hasn't fired yet, update here
  await supabase
    .from('intakes')
    .update({
      payment_status: 'paid',
      payment_id: paymentIntent.id,
    })
    .eq('id', intakeId)
    .is('paid_at', null)
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const intakeId = paymentIntent.metadata?.intake_id

  if (!intakeId) {
    return
  }

  await supabase
    .from('intakes')
    .update({
      payment_status: 'failed',
    })
    .eq('id', intakeId)

  // Log audit event
  await supabase.rpc('log_audit_event', {
    p_event_type: 'payment_received',
    p_description: 'Payment failed',
    p_intake_id: intakeId,
    p_actor_type: 'webhook',
    p_metadata: {
      payment_intent: paymentIntent.id,
      failure_code: paymentIntent.last_payment_error?.code,
      failure_message: paymentIntent.last_payment_error?.message,
    },
  })
}

/**
 * Send confirmation email
 */
async function sendConfirmationEmail(intakeId: string, patientId: string) {
  // Get intake and patient details
  const { data: intake } = await supabase
    .from('intakes')
    .select(`
      reference_number,
      is_priority,
      sla_deadline,
      services (
        name
      )
    `)
    .eq('id', intakeId)
    .single()

  const { data: patient } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', patientId)
    .single()

  if (!intake || !patient) {
    return
  }

  // Calculate estimated time
  const slaDeadline = new Date(intake.sla_deadline!)
  const now = new Date()
  const minutesRemaining = Math.round((slaDeadline.getTime() - now.getTime()) / 60000)
  const estimatedTime =
    minutesRemaining <= 60
      ? `${minutesRemaining} minutes`
      : `${Math.round(minutesRemaining / 60)} hours`

  // In production, use your email service (Resend, SendGrid, etc.)
  // This is a placeholder
  console.log(`
    SEND CONFIRMATION EMAIL:
    To: ${patient.email}
    Subject: Your ${(intake.services as { name: string }).name} request has been submitted
    Reference: ${intake.reference_number}
    Priority: ${intake.is_priority}
    Estimated time: ${estimatedTime}
  `)

  // Example with Resend (uncomment when ready):
  // const resend = new Resend(env.resendApiKey)
  // await resend.emails.send({
  //   from: 'InstantMed <noreply@instantmed.com.au>',
  //   to: patient.email,
  //   subject: `Your ${intake.services.name} request has been submitted`,
  //   react: RequestSubmittedEmail({
  //     patientName: patient.full_name,
  //     referenceNumber: intake.reference_number,
  //     serviceName: intake.services.name,
  //     isPriority: intake.is_priority,
  //     estimatedTime,
  //     dashboardUrl: `${env.appUrl}/patient/requests/${intakeId}`,
  //   }),
  // })
}
