import "server-only"
import Stripe from "stripe"

// Validate required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Price ID mapping based on category/subtype
export type ServiceCategory = "medical_certificate" | "prescription"

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
      return "$24.95"
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
    prescription: 2495,
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
