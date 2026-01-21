import "server-only"
import Stripe from "stripe"

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


// Price ID mapping based on category/subtype
export type ServiceCategory = "medical_certificate" | "prescription" | "consult"

interface PriceIdInput {
  category: ServiceCategory
  subtype: string
  answers?: Record<string, unknown>
}

/**
 * Calculate number of absence days from answers
 * Returns 1 for 'today' or 'yesterday', calculates from dates for 'multi_day'
 */
function getAbsenceDays(answers?: Record<string, unknown>): number {
  if (!answers) return 1
  
  const absenceDates = answers.absence_dates as string | undefined
  
  // Single day options
  if (absenceDates === 'today' || absenceDates === 'yesterday') {
    return 1
  }
  
  // Multi-day: calculate from start_date and end_date
  if (absenceDates === 'multi_day') {
    const startDate = answers.start_date as string | undefined
    const endDate = answers.end_date as string | undefined
    
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include both days
      return diffDays
    }
  }
  
  // Default to 1 day if we can't determine
  return 1
}

/**
 * Get the correct Stripe price ID based on request category, subtype, and answers
 */
export function getPriceIdForRequest({ category, answers }: PriceIdInput): string {
  // Medical certificates - tiered pricing based on duration
  if (category === "medical_certificate") {
    const absenceDays = getAbsenceDays(answers)
    
    // 2-day certificates use higher price
    if (absenceDays === 2) {
      const priceId = process.env.STRIPE_PRICE_MEDCERT_2DAY
      if (!priceId) {
        throw new Error("Missing STRIPE_PRICE_MEDCERT_2DAY environment variable")
      }
      return priceId
    }
    
    // 1-day certificates (default)
    const priceId = process.env.STRIPE_PRICE_MEDCERT
    if (!priceId) {
      throw new Error("Missing STRIPE_PRICE_MEDCERT environment variable")
    }
    return priceId
  }

  // Prescriptions - all use the same price
  if (category === "prescription") {
    const priceId = process.env.STRIPE_PRICE_PRESCRIPTION
    if (!priceId) {
      throw new Error("Missing STRIPE_PRICE_PRESCRIPTION environment variable")
    }
    return priceId
  }

  // General Consult - for new prescriptions and complex cases
  if (category === "consult") {
    const priceId = process.env.STRIPE_PRICE_CONSULT
    if (!priceId) {
      throw new Error("Missing STRIPE_PRICE_CONSULT environment variable")
    }
    return priceId
  }

  throw new Error(`Unknown category: ${category}`)
}

/**
 * Get display price for a service category (for UI)
 * For medical certificates, pass absenceDays to get tiered pricing
 */
export function getDisplayPriceForCategory(category: ServiceCategory, absenceDays?: number): string {
  switch (category) {
    case "medical_certificate":
      return absenceDays === 2 ? "$29.95" : "$19.95"
    case "prescription":
      return "$29.95"
    case "consult":
      return "$49.95"
    default:
      return "$19.95"
  }
}

/**
 * Calculate base price for a service category (in cents)
 * For medical certificates, pass absenceDays to get tiered pricing
 */
export function getBasePriceCents(category: ServiceCategory, absenceDays?: number): number {
  if (category === "medical_certificate") {
    return absenceDays === 2 ? 2995 : 1995
  }
  
  const basePrices: Record<ServiceCategory, number> = {
    medical_certificate: 1995,
    prescription: 2995,
    consult: 4995,
  }
  return basePrices[category] || 1995
}
