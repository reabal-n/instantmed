/**
 * Cron-owned sequence types that have no safe plaintext reconstruction path.
 * Current rows carry a frozen encrypted provider payload and bypass this list;
 * it remains the terminal/quiet classification for genuinely legacy rows and
 * the historical unsupported bookkeeping they produced.
 */
export const CRON_OWNED_NON_RECONSTRUCTABLE_EMAIL_TYPES = [
  "refill_reminder",
  "cert_reactivation",
  "heard_about_us_backfill",
  "abandoned_checkout",
  "abandoned_checkout_followup",
] as const

export const INTENTIONAL_EMAIL_SUPPRESSION_PREFIX = "Suppressed before delivery:"

const CRON_OWNED_NON_RECONSTRUCTABLE_EMAIL_TYPE_SET = new Set<string>(
  CRON_OWNED_NON_RECONSTRUCTABLE_EMAIL_TYPES,
)

export function isCronOwnedNonReconstructableEmailType(emailType: string | null | undefined): boolean {
  return typeof emailType === "string" && CRON_OWNED_NON_RECONSTRUCTABLE_EMAIL_TYPE_SET.has(emailType)
}

export function isNonActionableEmailFailure(row: {
  email_type?: string | null
  status?: string | null
  error_message?: string | null
}): boolean {
  const emailType = row.email_type
  const errorMessage = row.error_message

  return (
    row.status === "failed" &&
    (
      (isCronOwnedNonReconstructableEmailType(emailType) && (
        errorMessage === `Unsupported email_type: ${emailType}` ||
        errorMessage === `Cannot reconstruct email type '${emailType}' - unsupported type`
      )) ||
      errorMessage?.startsWith(INTENTIONAL_EMAIL_SUPPRESSION_PREFIX) === true
    )
  )
}

export function filterNonActionableEmailFailures<T extends {
  email_type?: string | null
  status?: string | null
  error_message?: string | null
}>(rows: T[]): T[] {
  return rows.filter((row) => !isNonActionableEmailFailure(row))
}
