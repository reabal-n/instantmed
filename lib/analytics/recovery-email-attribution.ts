import type { AttributionClassificationInput } from "@/lib/analytics/source-classification"

const RECOVERY_EMAIL_CAMPAIGNS = [
  "partial_intake_recovery",
  "abandoned_checkout",
  "abandoned_checkout_followup",
  "payment_failed",
  "async_payment_failed",
  "support_payment_recovery",
  "stranded_checkout_recovery",
  "checkout_expired",
] as const

export type RecoveryEmailAttributionInput = AttributionClassificationInput & {
  recovery_email_engaged_at?: string | null
}

function clean(value?: string | null): string {
  return value?.trim().toLowerCase() ?? ""
}

function isRecoveryEmailCampaign(value: string): boolean {
  return (RECOVERY_EMAIL_CAMPAIGNS as readonly string[]).includes(value)
}

export function isRecoveryEmailAttributed(
  row: RecoveryEmailAttributionInput,
): boolean {
  if (clean(row.recovery_email_engaged_at)) return true

  const campaign = clean(row.utm_campaign)
  return (
    clean(row.utm_source) === "recovery_email" &&
    clean(row.utm_medium) === "email" &&
    isRecoveryEmailCampaign(campaign)
  )
}
