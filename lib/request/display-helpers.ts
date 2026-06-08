/**
 * Shared display helpers for the intake flow
 *
 * Single source of truth for service labels and price display.
 * Used by review-step, checkout-step, request-flow, and service hub.
 */

import { MED_CERT_DURATIONS,PRICING } from "@/lib/constants"
import { getConsultSubtypePrice } from "@/lib/stripe/price-mapping"
import type { UnifiedServiceType } from "@/types/services"

// ── Service labels ──────────────────────────────────────────────────────

export const SERVICE_DISPLAY_LABELS: Record<UnifiedServiceType, string> = {
  'med-cert': 'Medical Certificate',
  'prescription': 'Prescription Request',
  'repeat-script': 'Repeat Prescription',
  'consult': 'Doctor Consultation',
}

export const CONSULT_SUBTYPE_DISPLAY_LABELS: Record<string, string> = {
  general: 'Specialty Consultation',
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
 * Single source of truth - used by both review-step and checkout-step.
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

export interface MedCertExtraDayOffer {
  nextDuration: '2'
  nextDays: 2
  nextPrice: number
  delta: number
}

/**
 * The one-tap "add a second day" offer shown at med-cert checkout when the
 * patient is on the 1-day floor tier. Returns null otherwise — we only nudge the
 * floor cohort once (no 2->3 chaining), the patient self-reports duration and
 * the doctor reviews every certificate, and the 3-day cap is unchanged.
 */
export function getMedCertExtraDayOffer(
  serviceType: UnifiedServiceType,
  answers: Record<string, unknown>,
): MedCertExtraDayOffer | null {
  if (serviceType !== 'med-cert') return null
  if (String(answers.duration || '') !== '1') return null

  const oneDay = MED_CERT_DURATIONS.prices[1]
  const twoDay = MED_CERT_DURATIONS.prices[2]
  return {
    nextDuration: '2',
    nextDays: 2,
    nextPrice: twoDay,
    delta: Math.round((twoDay - oneDay) * 100) / 100,
  }
}
