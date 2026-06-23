import type { UnifiedServiceType } from "@/lib/request/step-registry"

/**
 * Repeat-quantity & supply standard — the single source of truth shared by the
 * patient-facing intake copy, the reactivation reminder cron, and docs/CLINICAL.md
 * so they can never drift.
 *
 * IMPORTANT — this is a DEFAULT, not a rule. The prescribing doctor sets the
 * actual repeats inside Parchment per clinical judgment (fewer for a new or
 * unstable medicine; none where a repeat is inappropriate). Patient-facing copy
 * derived from this must be expectation-setting only ("if approved … usually"),
 * never a guarantee or inducement (AHPRA/TGA), and never imply a subscription or
 * ongoing/monthly prescribing (see docs/CLINICAL.md prescribing posture).
 */

/** Default number of repeats on a standard repeatable script (script + 2 repeats). */
export const DEFAULT_REPEATS = 2

/** Nominal supply for a daily medicine at the default (≈ 3 × a 28-30 day pack). */
export const STANDARD_SUPPLY_MONTHS = 3

/**
 * Reactivation reminder window, in days since the script was issued. Lands at
 * ~week 10-11 — before a ~3-month (script + 2 repeats) supply of a daily medicine
 * is exhausted — so the patient can reorder without a gap. A daily cron catches
 * each script once as it enters the band; `refill_reminder_sent_at` dedups.
 */
export const REFILL_REMINDER_WINDOW_MIN_DAYS = 70
export const REFILL_REMINDER_WINDOW_MAX_DAYS = 77

const DOCTOR_DISCRETION = "The number of repeats is always the doctor's decision."

/**
 * Patient-facing "what to expect" line for the repeats standard, or null for
 * services where repeats don't apply (med certs; women's health — narrow launch
 * + acute UTI; weight loss — gated). Expectation-setting, not a promise.
 */
export function getRepeatsExpectation(
  serviceType: UnifiedServiceType,
  consultSubtype?: string | null,
): string | null {
  const isRepeatScript = serviceType === "repeat-script" || serviceType === "prescription"
  const isEd = serviceType === "consult" && consultSubtype === "ed"
  const isHairLoss = serviceType === "consult" && consultSubtype === "hair_loss"

  // ED is frequently on-demand (e.g. sildenafil) where a "months of supply" claim
  // doesn't map to usage — surface the repeats count without a duration.
  if (isEd) {
    return `If your doctor approves, you'll usually get your script plus up to ${DEFAULT_REPEATS} repeats, then a quick review before your next one. ${DOCTOR_DISCRETION}`
  }
  if (isRepeatScript || isHairLoss) {
    return `If your doctor approves, you'll usually get your script plus up to ${DEFAULT_REPEATS} repeats — around ${STANDARD_SUPPLY_MONTHS} months for a daily medicine — then a quick review before your next one. ${DOCTOR_DISCRETION}`
  }
  return null
}
