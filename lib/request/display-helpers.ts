/**
 * Shared display helpers for the intake flow
 *
 * Single source of truth for service labels and price display.
 * Used by review-step, checkout-step, request-flow, and service hub.
 */

import { PRICING, MED_CERT_DURATIONS } from "@/lib/constants"
import { getConsultSubtypePrice } from "@/lib/stripe/price-mapping"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

// ── Service labels ──────────────────────────────────────────────────────

export const SERVICE_DISPLAY_LABELS: Record<UnifiedServiceType, string> = {
  'med-cert': 'Medical Certificate',
  'prescription': 'Prescription Request',
  'repeat-script': 'Repeat Prescription',
  'consult': 'Doctor Consultation',
}

export const CONSULT_SUBTYPE_DISPLAY_LABELS: Record<string, string> = {
  general: 'General Consultation',
  ed: 'ED Consultation',
  hair_loss: 'Hair Loss Consultation',
  womens_health: "Women's Health Consultation",
  weight_loss: 'Weight Management Consultation',
}

/**
 * Get the display label for a service, factoring in consult subtypes
 */
export function getServiceDisplayLabel(
  serviceType: UnifiedServiceType,
  consultSubtype?: string,
): string {
  if (serviceType === 'consult' && consultSubtype) {
    return CONSULT_SUBTYPE_DISPLAY_LABELS[consultSubtype] || SERVICE_DISPLAY_LABELS[serviceType]
  }
  return SERVICE_DISPLAY_LABELS[serviceType]
}

// ── Price display ───────────────────────────────────────────────────────

/**
 * Get the display price (in dollars) for a service + answers combination.
 * Single source of truth — used by both review-step and checkout-step.
 */
export function getDisplayPrice(
  serviceType: UnifiedServiceType,
  answers: Record<string, unknown>,
): number {
  if (serviceType === 'med-cert') {
    const duration = String(answers.duration || '')
    const durationNum = Number(duration) as keyof typeof MED_CERT_DURATIONS.prices
    if (durationNum && MED_CERT_DURATIONS.prices[durationNum]) {
      return MED_CERT_DURATIONS.prices[durationNum]
    }
    // Fallback: cheapest to avoid overcharging
    return PRICING.MED_CERT
  }

  if (serviceType === 'prescription' || serviceType === 'repeat-script') {
    return PRICING.REPEAT_SCRIPT
  }

  if (serviceType === 'consult') {
    const subtype = String(answers.consultSubtype || '')
    return getConsultSubtypePrice(subtype)
  }

  return PRICING.CONSULT
}
