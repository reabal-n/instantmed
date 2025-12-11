import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Initialize lazily to avoid build errors
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(key)
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase credentials not configured')
  }
  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const stripe = getStripe()
  const supabase = getSupabase()
  
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Check if we've already processed this event
  const { data: existingEvent } = await supabase
    .from('stripe_webhook_events')
    .select('id')
    .eq('event_id', event.id)
    .single()

  if (existingEvent) {
    return NextResponse.json({ received: true, status: 'already_processed' })
  }

  // Record the event
  await supabase.from('stripe_webhook_events').insert({
    event_id: event.id,
    event_type: event.type,
  })

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const requestId = paymentIntent.metadata.request_id

      if (requestId) {
        // Update the request status
        await supabase
          .from('requests')
          .update({
            paid: true,
            payment_status: 'paid',
          })
          .eq('id', requestId)

        // Create or update payment record
        await supabase.from('payments').upsert({
          request_id: requestId,
          stripe_payment_intent_id: paymentIntent.id,
          stripe_session_id: paymentIntent.id, // Using PI ID as session
          amount: paymentIntent.amount,
          amount_paid: paymentIntent.amount_received,
          currency: paymentIntent.currency,
          status: 'paid',
        }, {
          onConflict: 'stripe_payment_intent_id',
        })

        console.log(`Payment succeeded for request ${requestId}`)
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const requestId = paymentIntent.metadata.request_id

      if (requestId) {
        await supabase
          .from('requests')
          .update({
            payment_status: 'failed',
          })
          .eq('id', requestId)

        await supabase.from('payments').upsert({
          request_id: requestId,
          stripe_payment_intent_id: paymentIntent.id,
          stripe_session_id: paymentIntent.id,
          amount: paymentIntent.amount,
          status: 'failed',
        }, {
          onConflict: 'stripe_payment_intent_id',
        })

        console.log(`Payment failed for request ${requestId}`)
      }
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
