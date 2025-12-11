import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Initialize Stripe lazily to avoid build errors
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(key)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, requestId, serviceType, isBackdated, priorityReview } = body

    if (!amount || !requestId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const stripe = getStripe()
    
    // Create a PaymentIntent with metadata for webhook linking
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'aud',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        request_id: requestId,
        service_type: serviceType,
        is_backdated: isBackdated ? 'true' : 'false',
        priority_review: priorityReview ? 'true' : 'false',
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    })
  } catch (error) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}

