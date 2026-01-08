import "server-only"
import Stripe from "stripe"

// Validate required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  // Allow build to proceed without Stripe key (it will be provided at runtime)
  // Note: This warning is acceptable at module load time
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.warn("Warning: STRIPE_SECRET_KEY environment variable not set")
  }
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder')


// Price ID mapping based on category/subtype
export type ServiceCategory = "medical_certificate" | "prescription" | "consult"

interface PriceIdInput {
  category: ServiceCategory
  subtype: string
  answers?: Record<string, unknown>
}

/**
 * Get the correct Stripe price ID based on request category, subtype, and answers
 */
export function getPriceIdForRequest({ category }: PriceIdInput): string {
  // Medical certificates - all use the same price
  if (category === "medical_certificate") {
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
 */
export function getDisplayPriceForCategory(category: ServiceCategory): string {
  switch (category) {
    case "medical_certificate":
      return "$19.95"
    case "prescription":
      return "$29.95"
    case "consult":
      return "$49.95"
    default:
      return "$19.95"
  }
}

export const PRIORITY_REVIEW_PRICE = 1000 // $10.00 in cents
export const AFTER_HOURS_PRICE = 3995 // $39.95 in cents

/**
 * Calculate total price including add-ons
 */
export function calculateTotalPrice(
  category: ServiceCategory,
  options: { priorityReview?: boolean; afterHours?: boolean } = {},
): number {
  const basePrices: Record<ServiceCategory, number> = {
    medical_certificate: 1995,
    prescription: 2995,
    consult: 4995,
  }

  let total = basePrices[category] || 1995

  if (options.priorityReview) {
    total += PRIORITY_REVIEW_PRICE
  }

  if (options.afterHours) {
    total += AFTER_HOURS_PRICE - basePrices[category] // After hours replaces base price
  }

  return total
}
