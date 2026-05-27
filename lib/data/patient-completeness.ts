import { validateMedicareNumber } from "@/lib/validation/medicare"
import type { Profile } from "@/types/db"

/**
 * Patient profile completeness summary.
 *
 * Used by the patient dashboard meter to nudge patients toward a fully
 * filled profile. Reduces downstream prescribing-identity chase-ups, the
 * biggest recurring ops drain.
 *
 * Source of truth: `computePatientProfileCompleteness(profile)`. Consumers
 * should hydrate from a profile row they already fetched rather than
 * re-querying.
 */
export interface PatientProfileCompleteness {
  /** Total tracked fields (currently 10). */
  total: number
  /** Number of filled fields out of `total`. */
  filled: number
  /** Fields still missing, in stable display order. */
  missingFields: Array<{ key: PatientCompletenessField; label: string }>
  /** Fraction 0-1 for the progress bar. */
  ratio: number
  /** True iff `filled === total`. Components use this to self-hide. */
  isComplete: boolean
}

export type PatientCompletenessField =
  | "full_name"
  | "date_of_birth"
  | "email"
  | "phone"
  | "sex"
  | "address_line1"
  | "suburb"
  | "state"
  | "postcode"
  | "medicare_number"

/**
 * Subset of profile columns this helper inspects. Defined as a Pick so it
 * stays in lockstep with the live `Profile` type.
 */
export type PatientCompletenessInput = Pick<
  Profile,
  | "full_name"
  | "date_of_birth"
  | "email"
  | "phone"
  | "sex"
  | "address_line1"
  | "suburb"
  | "state"
  | "postcode"
  | "medicare_number"
>

interface FieldDef {
  key: PatientCompletenessField
  label: string
  /** Returns true when the field on `profile` should count as filled. */
  isFilled: (profile: PatientCompletenessInput) => boolean
}

/**
 * Treat empty strings, whitespace-only strings, and null/undefined as
 * "not filled". A blank `""` in the DB is just as broken as a NULL for
 * downstream prescribing-identity reads.
 */
function hasValue(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false
  return value.trim().length > 0
}

function hasValidMedicareNumber(value: string | null | undefined): boolean {
  const medicare = value?.trim()
  if (!medicare) return false
  return validateMedicareNumber(medicare).valid
}

/** Field set ordered for display in the missing list. */
const FIELDS: readonly FieldDef[] = [
  { key: "full_name", label: "Full name", isFilled: (p) => hasValue(p.full_name) },
  { key: "date_of_birth", label: "Date of birth", isFilled: (p) => hasValue(p.date_of_birth) },
  { key: "email", label: "Email", isFilled: (p) => hasValue(p.email) },
  { key: "phone", label: "Phone", isFilled: (p) => hasValue(p.phone) },
  { key: "sex", label: "Sex", isFilled: (p) => hasValue(p.sex) },
  { key: "address_line1", label: "Address", isFilled: (p) => hasValue(p.address_line1) },
  { key: "suburb", label: "Suburb", isFilled: (p) => hasValue(p.suburb) },
  { key: "state", label: "State", isFilled: (p) => hasValue(p.state) },
  { key: "postcode", label: "Postcode", isFilled: (p) => hasValue(p.postcode) },
  { key: "medicare_number", label: "Medicare number", isFilled: (p) => hasValidMedicareNumber(p.medicare_number) },
] as const

export const PATIENT_COMPLETENESS_TOTAL = FIELDS.length

/**
 * Compute completeness for a patient profile row.
 *
 * Pure function: takes an already-fetched profile so the caller can reuse
 * what it already loaded for the page. Returns a stable summary used by
 * the `ProfileCompletenessMeter` UI component.
 */
export function computePatientProfileCompleteness(
  profile: PatientCompletenessInput,
): PatientProfileCompleteness {
  const missingFields: Array<{ key: PatientCompletenessField; label: string }> = []
  let filled = 0

  for (const field of FIELDS) {
    if (field.isFilled(profile)) {
      filled += 1
    } else {
      missingFields.push({ key: field.key, label: field.label })
    }
  }

  const total = FIELDS.length
  const ratio = total === 0 ? 1 : filled / total
  const isComplete = filled === total

  return {
    total,
    filled,
    missingFields,
    ratio,
    isComplete,
  }
}
