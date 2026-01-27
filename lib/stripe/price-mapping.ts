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
  
  // Unified flow uses 'duration' directly as "1" or "2"
  const duration = answers.duration as string | undefined
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
  
  // Log warning in dev if subtype doesn't have a specific price
  if (process.env.NODE_ENV === 'development' && subtype && !['general', 'new_medication'].includes(subtype)) {
    // eslint-disable-next-line no-console
    console.warn(`[Stripe] No specific price for consult subtype '${subtype}', using default STRIPE_PRICE_CONSULT`)
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

  // Consult - subtype-specific pricing
  if (category === "consult") {
    return getConsultPriceId(subtype, answers)
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
