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

/** Exhaustive list of valid cert categories (used for URL param validation). */
export const VALID_CERT_CATEGORIES: readonly CertCategory[] = [
  "work",
  "study",
  "carer",
] as const

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
      "Special consideration, missed exam, or assignment extension.",
    reasons: [
      "Exam deferral",
      "Assignment extension",
      "Missed classes",
      "Special consideration",
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
