import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'

// Initialize Stripe lazily to avoid build errors
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(key)
}

// Input validation schema
const paymentIntentSchema = z.object({
  amount: z.number()
    .int('Amount must be a whole number')
    .min(100, 'Amount must be at least $1.00')
    .max(100000, 'Amount exceeds maximum allowed'), // $1000 max
  requestId: z.string()
    .uuid('Invalid request ID format'),
  serviceType: z.enum(['sick_cert', 'prescription', 'pathology', 'referral']),
  isBackdated: z.boolean().optional().default(false),
  priorityReview: z.boolean().optional().default(false),
})

// Simple in-memory rate limiting (for production, use Redis)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 10 // Max 10 requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  
  if (!entry || now - entry.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, timestamp: now })
    return false
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return true
  }
  
  entry.count++
  return false
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
    
    // Check rate limit
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    
    // Validate input using Zod
    const parseResult = paymentIntentSchema.safeParse(body)
    
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => e.message).join(', ')
      return NextResponse.json(
        { error: `Invalid request: ${errors}` },
        { status: 400 }
      )
    }

    const { amount, requestId, serviceType, isBackdated, priorityReview } = parseResult.data

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

