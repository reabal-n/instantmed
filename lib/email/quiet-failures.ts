export const CRON_OWNED_NON_RECONSTRUCTABLE_EMAIL_TYPES = [
  "refill_reminder",
  "cert_reactivation",
  "heard_about_us_backfill",
  "partial_intake_recovery",
  "abandoned_checkout",
  "abandoned_checkout_followup",
  "review_request",
] as const

const CRON_OWNED_NON_RECONSTRUCTABLE_EMAIL_TYPE_SET = new Set<string>(
  CRON_OWNED_NON_RECONSTRUCTABLE_EMAIL_TYPES,
)

export function isCronOwnedNonReconstructableEmailType(emailType: string | null | undefined): boolean {
  return typeof emailType === "string" && CRON_OWNED_NON_RECONSTRUCTABLE_EMAIL_TYPE_SET.has(emailType)
}

export function isQuietCronOwnedEmailFailure(row: {
  email_type?: string | null
  status?: string | null
  error_message?: string | null
}): boolean {
  return (
    row.status === "failed" &&
    isCronOwnedNonReconstructableEmailType(row.email_type) &&
    row.error_message === `Unsupported email_type: ${row.email_type}`
  )
}

export function filterQuietCronOwnedEmailFailures<T extends {
  email_type?: string | null
  status?: string | null
  error_message?: string | null
}>(rows: T[]): T[] {
  return rows.filter((row) => !isQuietCronOwnedEmailFailure(row))
}
