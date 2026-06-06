export interface PartialIntakeRecoveryUrlDraft {
  consultSubtype?: "ed" | "hair_loss" | null
  serviceType: string
  sessionId: string
}

export function buildPartialIntakeRecoveryUrl({
  appUrl,
  draft,
}: {
  appUrl: string
  draft: PartialIntakeRecoveryUrlDraft
}): string {
  const baseUrl = appUrl.replace(/\/$/, "")
  const url = new URL(draft.serviceType === "consult" && !draft.consultSubtype ? "/consult" : "/request", baseUrl)

  if (draft.serviceType !== "consult" || draft.consultSubtype) {
    url.searchParams.set("service", draft.serviceType)
  }
  if (draft.consultSubtype) {
    url.searchParams.set("subtype", draft.consultSubtype)
  }
  url.searchParams.set("d", draft.sessionId)
  url.searchParams.set("utm_source", "recovery_email")
  url.searchParams.set("utm_medium", "email")
  url.searchParams.set("utm_campaign", "partial_intake_recovery")
  url.searchParams.set("utm_content", draft.serviceType)

  // Retired bare consult drafts cannot safely resume into checkout. Send them
  // to the services overview instead of a dead `/request?service=consult` URL.
  return url.toString()
}

export type AbandonedCheckoutRecoveryCampaign = "abandoned_checkout" | "abandoned_checkout_followup"

export function buildAbandonedCheckoutResumeUrl({
  appUrl,
  campaign,
  intakeId,
}: {
  appUrl: string
  campaign: AbandonedCheckoutRecoveryCampaign
  intakeId: string
}): string {
  const url = new URL(`/patient/intakes/${encodeURIComponent(intakeId)}`, appUrl.replace(/\/$/, ""))
  url.searchParams.set("retry", "true")
  url.searchParams.set("utm_source", "recovery_email")
  url.searchParams.set("utm_medium", "email")
  url.searchParams.set("utm_campaign", campaign)
  return url.toString()
}
