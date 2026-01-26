import "server-only"
import Stripe from "stripe"

// Re-export price mapping functions (these don't need server-only)
// This allows consumers to import from @/lib/stripe/client as before
export {
  getPriceIdForRequest,
  getConsultPriceId,
  getAbsenceDays,
  getDisplayPriceForCategory,
  getBasePriceCents,
  type ServiceCategory,
  type PriceIdInput,
} from "./price-mapping"

// Validate required environment variables - fail fast in production
if (!process.env.STRIPE_SECRET_KEY) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error("STRIPE_SECRET_KEY is required in production")
  }
  // eslint-disable-next-line no-console
  console.warn("Warning: STRIPE_SECRET_KEY environment variable not set")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  timeout: 15000, // 15 second timeout to prevent serverless function timeouts
  maxNetworkRetries: 2, // Automatic retries for network errors
})
