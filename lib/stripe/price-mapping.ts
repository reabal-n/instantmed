import { PRICING, PRICING_DISPLAY } from "@/lib/constants"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("stripe-price-mapping")

/**
 * Stripe Price ID Mapping
 *
 * Maps service categories and subtypes to Stripe price IDs.
 * Extracted from client.ts for testability (no "server-only" restriction).
 */

export type ServiceCategory = "medical_certificate" | "prescription" | "consult"

export interface PriceIdInput {
  category: ServiceCategory
  subtype: string
  answers?: Record<string, unknown>
}

/**
 * Calculate number of absence days from answers
 * Supports both unified flow (duration: "1" | "2") and legacy flow (absence_dates)
 */
export function getAbsenceDays(answers?: Record<string, unknown>): number {
  if (!answers) return 1
  
  // Unified flow uses 'duration' directly as "1", "2", or "3"
  const duration = answers.duration as string | undefined
  if (duration === '3') {
    return 3
  }
  if (duration === '2') {
    return 2
  }
  if (duration === '1') {
    return 1
  }
  
  // Legacy flow uses absence_dates
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
 * Get Stripe price ID for consult based on subtype
 * Falls back to default consult price if subtype-specific price not found
 */
export function getConsultPriceId(subtype: string, answers?: Record<string, unknown>): string {
  // Subtype-specific price IDs
  const subtypePriceIds: Record<string, string | undefined> = {
    'ed': process.env.STRIPE_PRICE_CONSULT_ED,
    'hair_loss': process.env.STRIPE_PRICE_CONSULT_HAIR_LOSS,
    'womens_health': process.env.STRIPE_PRICE_CONSULT_WOMENS_HEALTH,
    'weight_loss': process.env.STRIPE_PRICE_CONSULT_WEIGHT_LOSS,
  }
  
  // Check for subtype-specific price
  const subtypePriceId = subtypePriceIds[subtype]
  if (subtypePriceId) {
    return subtypePriceId
  }
  
  // Also check consultSubtype from answers (fallback for URL-driven flow)
  const consultSubtype = answers?.consultSubtype as string | undefined
  if (consultSubtype && subtypePriceIds[consultSubtype]) {
    return subtypePriceIds[consultSubtype]!
  }
  
  // Default to general consult price (covers 'general' and 'new_medication')
  const defaultPriceId = process.env.STRIPE_PRICE_CONSULT
  if (!defaultPriceId) {
    throw new Error("Missing STRIPE_PRICE_CONSULT environment variable")
  }

  // Hard fail in production if a KNOWN subtype is missing its dedicated env var —
  // mischarging a customer is worse than a 500. env.ts already validates the four
  // subtype vars at boot in production; this is a belt-and-braces runtime check
  // per checkout in case of late env mutation or misconfigured subset deploys.
  const isKnownSubtypeWithoutEnv = subtype in subtypePriceIds && !subtypePriceIds[subtype]
  if (isKnownSubtypeWithoutEnv) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Missing Stripe price env var for consult subtype '${subtype}'. ` +
        `Expected STRIPE_PRICE_CONSULT_${subtype.toUpperCase()} ` +
        `(one of: STRIPE_PRICE_CONSULT_ED, STRIPE_PRICE_CONSULT_HAIR_LOSS, ` +
        `STRIPE_PRICE_CONSULT_WOMENS_HEALTH, STRIPE_PRICE_CONSULT_WEIGHT_LOSS).`
      )
    }
    logger.warn("No specific price for consult subtype, using default (dev/test only)", { subtype })
  } else if (subtype && subtype !== 'general') {
    // Unknown subtype (e.g. 'new_medication', future values) — silent fallback,
    // these are intentionally routed through the generic consult price.
    logger.warn("No specific price for consult subtype, using default", { subtype })
  }

  return defaultPriceId
}

/**
 * Get the correct Stripe price ID based on request category, subtype, and answers
 */
export function getPriceIdForRequest({ category, subtype, answers }: PriceIdInput): string {
  // Medical certificates - tiered pricing based on duration
  if (category === "medical_certificate") {
    const absenceDays = getAbsenceDays(answers)
    
    // 3-day certificates use highest price
    if (absenceDays === 3) {
      const priceId = process.env.STRIPE_PRICE_MEDCERT_3DAY
      if (!priceId) {
        throw new Error("Missing STRIPE_PRICE_MEDCERT_3DAY environment variable")
      }
      return priceId
    }

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

  // Prescriptions — the intake flow is always for repeats ($29.95).
  // New prescriptions route through the consult flow and use STRIPE_PRICE_CONSULT ($49.95).
  if (category === "prescription") {
    const priceId = process.env.STRIPE_PRICE_REPEAT_SCRIPT
    if (!priceId) {
      throw new Error("Missing STRIPE_PRICE_REPEAT_SCRIPT environment variable")
    }
    return priceId
  }

  // Consult - subtype-specific pricing
  if (category === "consult") {
    return getConsultPriceId(subtype, answers)
  }

  throw new Error(`Unknown category: ${category}`)
}

/**
 * Get display price for consult subtype from env vars
 * Falls back to default consult price if not configured
 */
export function getConsultSubtypePrice(subtype?: string): number {
  if (!subtype) return PRICING.CONSULT

  // Canonical prices from constants — env vars override for runtime flexibility
  const subtypeDefaults: Record<string, number> = {
    'ed': PRICING.MENS_HEALTH,
    'hair_loss': PRICING.HAIR_LOSS,
    'womens_health': PRICING.WOMENS_HEALTH,
    'weight_loss': PRICING.WEIGHT_LOSS,
    'general': PRICING.CONSULT,
  }

  const subtypePrices: Record<string, string | undefined> = {
    'ed': process.env.NEXT_PUBLIC_PRICE_CONSULT_ED,
    'hair_loss': process.env.NEXT_PUBLIC_PRICE_CONSULT_HAIR_LOSS,
    'womens_health': process.env.NEXT_PUBLIC_PRICE_CONSULT_WOMENS_HEALTH,
    'weight_loss': process.env.NEXT_PUBLIC_PRICE_CONSULT_WEIGHT_LOSS,
    'general': process.env.NEXT_PUBLIC_PRICE_CONSULT,
  }

  const priceStr = subtypePrices[subtype] || process.env.NEXT_PUBLIC_PRICE_CONSULT
  return priceStr ? parseFloat(priceStr) : (subtypeDefaults[subtype] ?? PRICING.CONSULT)
}

/**
 * Get display price for a service category (for UI)
 * For medical certificates, pass absenceDays to get tiered pricing
 * For consults, pass consultSubtype to get subtype-specific pricing
 */
export function getDisplayPriceForCategory(
  category: ServiceCategory, 
  options?: { absenceDays?: number; consultSubtype?: string }
): string {
  const { absenceDays, consultSubtype } = options || {}
  
  switch (category) {
    case "medical_certificate":
      if (absenceDays === 3) return PRICING_DISPLAY.MED_CERT_3DAY
      return absenceDays === 2 ? PRICING_DISPLAY.MED_CERT_2DAY : PRICING_DISPLAY.MED_CERT
    case "prescription":
      return PRICING_DISPLAY.REPEAT_SCRIPT
    case "consult":
      return `$${getConsultSubtypePrice(consultSubtype).toFixed(2)}`
    default:
      return PRICING_DISPLAY.MED_CERT
  }
}

/**
 * Calculate base price for a service category (in cents)
 * For medical certificates, pass absenceDays to get tiered pricing
 */
export function getBasePriceCents(category: ServiceCategory, absenceDays?: number): number {
  if (category === "medical_certificate") {
    if (absenceDays === 3) return Math.round(PRICING.MED_CERT_3DAY * 100)
    return absenceDays === 2
      ? Math.round(PRICING.MED_CERT_2DAY * 100)
      : Math.round(PRICING.MED_CERT * 100)
  }

  const basePrices: Record<ServiceCategory, number> = {
    medical_certificate: Math.round(PRICING.MED_CERT * 100),
    prescription: Math.round(PRICING.REPEAT_SCRIPT * 100),
    consult: Math.round(PRICING.CONSULT * 100),
  }
  return basePrices[category] || Math.round(PRICING.MED_CERT * 100)
}
