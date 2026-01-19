/**
 * Services - Shared Types & Helpers (Client-Safe)
 * 
 * These types and helpers can be imported in both client and server components.
 * Server-only database operations remain in lib/data/services.ts
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Service {
  id: string
  slug: string
  name: string
  short_name: string | null
  description: string | null
  type: string
  category: string | null
  price_cents: number
  priority_fee_cents: number | null
  is_active: boolean
  requires_id_verification: boolean
  requires_medicare: boolean
  requires_photo: boolean
  min_age: number | null
  max_age: number | null
  allowed_states: string[] | null
  sla_standard_minutes: number
  sla_priority_minutes: number
  questionnaire_id: string | null
  eligibility_rules: Record<string, unknown>
  icon_name: string | null
  display_order: number
  badge_text: string | null
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
}

export interface ServiceInput {
  slug: string
  name: string
  short_name?: string | null
  description?: string | null
  type: string
  category?: string | null
  price_cents: number
  priority_fee_cents?: number | null
  is_active?: boolean
  requires_id_verification?: boolean
  requires_medicare?: boolean
  requires_photo?: boolean
  min_age?: number | null
  max_age?: number | null
  allowed_states?: string[] | null
  sla_standard_minutes?: number
  sla_priority_minutes?: number
  eligibility_rules?: Record<string, unknown>
  icon_name?: string | null
  display_order?: number
  badge_text?: string | null
  meta_title?: string | null
  meta_description?: string | null
}

// ============================================================================
// HELPERS (Client-Safe)
// ============================================================================

/**
 * Get service types for filtering
 */
export function getServiceTypes(): { value: string; label: string }[] {
  return [
    { value: "med_cert", label: "Medical Certificate" },
    { value: "repeat_rx", label: "Repeat Prescription" },
    { value: "consult", label: "Consultation" },
    { value: "referral", label: "Referral" },
  ]
}

/**
 * Format service type for display
 */
export function formatServiceType(type: string): string {
  const types = getServiceTypes()
  return types.find(t => t.value === type)?.label || type
}

/**
 * Format price in cents to AUD
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Format SLA time
 */
export function formatSLA(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/**
 * Get Australian states for dropdown
 */
export function getAustralianStates(): { value: string; label: string }[] {
  return [
    { value: "ACT", label: "Australian Capital Territory" },
    { value: "NSW", label: "New South Wales" },
    { value: "NT", label: "Northern Territory" },
    { value: "QLD", label: "Queensland" },
    { value: "SA", label: "South Australia" },
    { value: "TAS", label: "Tasmania" },
    { value: "VIC", label: "Victoria" },
    { value: "WA", label: "Western Australia" },
  ]
}
