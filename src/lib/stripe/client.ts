import Stripe from 'stripe'

// Initialize Stripe lazily to avoid build errors
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(key)
}

export const stripe = getStripe()
