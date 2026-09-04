export type CanonicalPrescriptionHistory =
  | "within_12_months"
  | "over_12_months"
  | "never"

const WITHIN_12_MONTH_VALUES = new Set([
  "within_12_months",
  "less_than_3_months",
  "last_3_months",
  "3_to_6_months",
  "6_to_12_months",
  "within_3mo",
  "3_6mo",
  "6_12mo",
])

const OVER_12_MONTH_VALUES = new Set([
  "over_12_months",
  "over_1yr",
])

/**
 * Canonical three-choice value for the current intake UI. Callers should use
 * this for selection state only; persisted legacy values remain untouched so
 * historical requests keep their original specificity.
 */
export function normalizePrescriptionHistory(
  value: unknown,
): CanonicalPrescriptionHistory | undefined {
  if (typeof value !== "string") return undefined
  if (WITHIN_12_MONTH_VALUES.has(value)) return "within_12_months"
  if (OVER_12_MONTH_VALUES.has(value)) return "over_12_months"
  if (value === "never") return "never"
  return undefined
}

/** Source-faithful labels for both the current choices and persisted aliases. */
export const PRESCRIPTION_HISTORY_LABELS: Readonly<Record<string, string>> = {
  within_12_months: "Within 12 months",
  over_12_months: "Over 12 months",
  never: "Never",
  less_than_3_months: "Less than 3 months ago",
  last_3_months: "Less than 3 months ago",
  "3_to_6_months": "3–6 months ago",
  "6_to_12_months": "6–12 months ago",
  within_3mo: "Within 3 months",
  "3_6mo": "3–6 months",
  "6_12mo": "6–12 months",
  over_1yr: "Over a year",
}
