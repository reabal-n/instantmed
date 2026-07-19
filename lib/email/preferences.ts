import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/service-role"

export type MarketingEmailDecision =
  | { kind: "allowed" }
  | { kind: "policy_suppressed" }
  | { kind: "transiently_blocked" }

/**
 * Resolve a patient's marketing preference without turning an unavailable
 * preference store into a permanent opt-out.
 */
export async function getMarketingEmailDecision(
  profileId: string,
): Promise<MarketingEmailDecision> {
  const serviceClient = createServiceRoleClient()

  const { data, error } = await serviceClient
    .from("email_preferences")
    .select("marketing_emails, abandoned_checkout_emails")
    .eq("profile_id", profileId)
    .maybeSingle()

  if (error) return { kind: "transiently_blocked" }

  // Consent is ON by default (operator decision 2026-07-17): a missing row
  // means the patient never touched email settings, which is the schema
  // default (all flags true). Rows are created lazily by the settings UI and
  // the unsubscribe flow, so absence = "never opted out", not "never agreed".
  // Every optional send still passes the one-click unsubscribe and the
  // account-less email_suppressions list at dispatch time.
  if (!data) return { kind: "allowed" }

  // Any explicit opt-out on a stored row silences all marketing sends.
  if (
    data.marketing_emails !== true ||
    data.abandoned_checkout_emails !== true
  ) {
    return { kind: "policy_suppressed" }
  }

  return { kind: "allowed" }
}

/**
 * Backward-compatible boolean gate. Existing callers remain fail-closed on
 * transient errors; lifecycle-aware callers can preserve retryability.
 */
export async function canSendMarketingEmail(profileId: string): Promise<boolean> {
  const decision = await getMarketingEmailDecision(profileId)
  return decision.kind === "allowed"
}
