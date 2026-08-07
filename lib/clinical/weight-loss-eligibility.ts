/**
 * Weight-management eligibility — the single source of truth for the BMI
 * floors (operator decision D-C, 2026-08-07, docs/plans/2026-08-07-weight-loss-
 * launch-plan.md).
 *
 * DECLINE below 27 outright; between 27 and 30 a weight-related comorbidity is
 * required (TGA-consistent, and the threshold the marketing copy has always
 * stated). Three divergent thresholds previously existed (<25 note, <27 flat
 * decline, 30+/27+ copy) — every consumer must read THESE constants: the
 * safety rules (lib/safety/rules.ts weightRules), the intake step's live
 * eligibility hint, and any public copy.
 */

/** Below this BMI the service always declines, comorbidity or not. */
export const WEIGHT_LOSS_BMI_FLOOR = 27

/** Between the floor and this value, a weight-related comorbidity is required. */
export const WEIGHT_LOSS_BMI_FLOOR_WITHOUT_COMORBIDITY = 30

/**
 * The comorbidity toggles that qualify a 27–29.9 BMI (weight-related
 * conditions per TGA indication language). Thyroid disorder is deliberately
 * NOT here — it is collected for the doctor's context, not as a qualifier.
 * The intake step derives `wlHasWeightComorbidity` from exactly these keys so
 * the safety rule evaluates one boolean instead of six missing-vs-false
 * toggle states.
 */
export const WEIGHT_LOSS_COMORBIDITY_KEYS = [
  "wlHistoryDiabetes",
  "wlHistoryHeartCondition",
  "wlHistoryHighBP",
  "wlHistorySleepApnea",
  "wlHistoryPCOS",
] as const

/** Round-half-up BMI to one decimal, or null when inputs are implausible. */
export function computeBmi(weightKg: number, heightCm: number): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm)) return null
  if (weightKg < 30 || weightKg > 300 || heightCm < 100 || heightCm > 250) return null
  return Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10
}
