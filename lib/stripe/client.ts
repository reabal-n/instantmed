import "server-only"

import Stripe from "stripe"

import { createLogger } from "@/lib/observability/logger"

// Re-export price mapping functions (these don't need server-only)
// This allows consumers to import from @/lib/stripe/client as before
export {
  getAbsenceDays,
  getAmountCentsForRequest,
  getBasePriceCents,
  getConsultPriceId,
  getDisplayPriceForCategory,
  getPriceIdForRequest,
  type PriceIdInput,
  type ServiceCategory,
} from "./price-mapping"

const log = createLogger("stripe-client")

// Validate required environment variables - fail fast in production
// Skip in CI - NODE_ENV=production is set by Next.js build but CI isn't real production
if (!process.env.STRIPE_SECRET_KEY) {
  if (process.env.NODE_ENV === 'production' && !process.env.CI) {
    throw new Error("STRIPE_SECRET_KEY is required in production")
  }
  log.warn("STRIPE_SECRET_KEY environment variable not set", {})
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_placeholder_for_build", {
  timeout: 15000, // 15 second timeout to prevent serverless function timeouts
  maxNetworkRetries: 2, // Automatic retries for network errors
})
