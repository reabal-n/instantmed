/**
 * Med cert landing page selector - data contract
 *
 * Extracted from CertificateTypeSelector so the category list, valid IDs,
 * and PostHog event name are unit-testable without jsdom.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CertCategory = "work" | "study" | "carer"
export type CertDuration = "1" | "2" | "3"

export interface CertCategoryDef {
  readonly id: CertCategory
  readonly label: string
  readonly description: string
  readonly reasons: readonly string[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** PostHog event fired when a user selects a certificate category. */
export const CERT_TYPE_POSTHOG_EVENT = "certificate_type_selected" as const

/** PostHog property key sent with the event. */
export const CERT_TYPE_POSTHOG_PROPERTY = "category" as const

/** PostHog event fired when a landing-page duration chip is selected. */
export const CERT_DURATION_POSTHOG_EVENT = "certificate_duration_selected" as const

/** PostHog property key sent with the duration event. */
export const CERT_DURATION_POSTHOG_PROPERTY = "duration" as const

/** PostHog event fired from the compact selector's primary CTA. */
export const CERT_SELECTOR_CTA_POSTHOG_EVENT = "certificate_selector_cta_clicked" as const

/** Exhaustive list of valid cert categories (used for URL param validation). */
export const VALID_CERT_CATEGORIES: readonly CertCategory[] = [
  "work",
  "study",
  "carer",
] as const

/** Exhaustive list of valid landing-page duration values. */
export const VALID_CERT_DURATIONS: readonly CertDuration[] = ["1", "2", "3"] as const

/** Full category definitions - single source of truth for the selector UI. */
export const CERT_CATEGORIES: readonly CertCategoryDef[] = [
  {
    id: "work",
    label: "Work",
    description:
      "Sick day, personal leave, or carer\u2019s leave for your employer.",
    reasons: ["Cold & flu", "Gastro", "Back pain", "Mental health", "Migraine"],
  },
  {
    id: "study",
    label: "Uni / TAFE",
    description:
      "Study absence documentation for your education provider.",
    reasons: [
      "Missed class",
      "Study absence",
      "Placement absence",
      "Coursework absence",
    ],
  },
  {
    id: "carer",
    label: "Carer\u2019s leave",
    description:
      "When you need time off to care for a sick family member.",
    reasons: [
      "Sick child",
      "Elderly parent",
      "Partner unwell",
      "Dependent care",
    ],
  },
] as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Type-guard: is a string a valid CertCategory?
 * Used by RequestFlow to validate URL params.
 */
export function isValidCertCategory(value: string): value is CertCategory {
  return (VALID_CERT_CATEGORIES as readonly string[]).includes(value)
}

/** Type-guard: is a string a supported certificate duration? */
export function isValidCertDuration(value: string): value is CertDuration {
  return (VALID_CERT_DURATIONS as readonly string[]).includes(value)
}

export function buildMedCertRequestHref({
  category,
  duration,
}: {
  category?: CertCategory | null
  duration?: CertDuration | string | null
} = {}) {
  const params = new URLSearchParams({ service: "med-cert" })

  if (category && isValidCertCategory(category)) {
    params.set("certType", category)
  }

  if (duration && isValidCertDuration(String(duration))) {
    params.set("duration", String(duration))
  }

  return `/request?${params.toString()}`
}
