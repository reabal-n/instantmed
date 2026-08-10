import type { TrackingHealth } from "@/lib/ads-agent/types"

export interface TrackingHealthInput {
  /**
   * Whether the Google Ads account state was actually read. When false, every
   * fact derived from it (auto-tagging, final URL suffix, primary purchase
   * action) is UNKNOWN rather than negative, and asserting the negative sends
   * the operator to fix settings that are not broken.
   */
  accountStateReadable: boolean
  autoTaggingEnabled: boolean
  browserOrGa4PurchasePrimary: boolean
  conversionLagImmature: boolean
  criticalInputsFresh: boolean
  criticalQueriesOk: boolean
  enabledCampaignCount: number
  evidenceAsOf: string
  googleDiagnosticsLagging: boolean
  localPaidOrders: number
  primaryPurchaseActionOk: boolean
  productionUploadWindowElapsed: boolean
  productionUploadsHealthy: boolean
  purchasePreflightOk: boolean
  requiredFinalUrlSuffixPresent: boolean
  spendAvailable: boolean
  stripeFeesComplete: boolean
  terminalClickAttributedAdjustmentFailures: number
  uploadAuditHealthy: boolean
}

/**
 * Collapses already-computed Ads, Supabase, Stripe, upload-audit, and
 * adjustment-health evidence into one deterministic operating gate.
 *
 * This stays intentionally pure: the existing monitoring modules own alert
 * thresholds and data reads; callers pass their outcomes here. A missing
 * critical fact is never converted to zero or treated as healthy.
 */
export function classifyTrackingHealth(input: TrackingHealthInput): TrackingHealth {
  const redReasonCodes: string[] = []
  const amberReasonCodes: string[] = []

  if (!input.criticalInputsFresh) {
    redReasonCodes.push("CRITICAL_INPUT_STALE")
  }
  if (!input.criticalQueriesOk) {
    redReasonCodes.push("CRITICAL_QUERY_FAILED")
  }
  // An unreadable account state is still RED — nothing about the account can
  // be verified — but it reports one honest cause instead of three fabricated
  // ones. Facts derived from the account state are only asserted when it was
  // actually read.
  if (!input.accountStateReadable) {
    redReasonCodes.push("ACCOUNT_STATE_UNREADABLE")
  }
  if (input.accountStateReadable && !input.primaryPurchaseActionOk) {
    redReasonCodes.push("PRIMARY_PURCHASE_ACTION_INVALID")
  }
  if (input.browserOrGa4PurchasePrimary) {
    redReasonCodes.push("BROWSER_PURCHASE_ACTION_PRIMARY")
  }
  if (!input.purchasePreflightOk) {
    redReasonCodes.push("PURCHASE_UPLOAD_PREFLIGHT_FAILED")
  }
  if (input.enabledCampaignCount > 0 && !input.spendAvailable) {
    redReasonCodes.push("ENABLED_CAMPAIGN_SPEND_UNAVAILABLE")
  }
  if (
    input.localPaidOrders > 0
    && input.productionUploadWindowElapsed
    && !input.productionUploadsHealthy
  ) {
    redReasonCodes.push("PRODUCTION_UPLOADS_MISSING")
  }
  if (!input.uploadAuditHealthy) {
    redReasonCodes.push("UPLOAD_AUDIT_UNHEALTHY")
  }
  if (input.terminalClickAttributedAdjustmentFailures > 0) {
    redReasonCodes.push("TERMINAL_CLICK_ADJUSTMENT_FAILURE")
  }
  if (input.accountStateReadable && !input.autoTaggingEnabled) {
    redReasonCodes.push("AUTO_TAGGING_DISABLED")
  }
  if (input.accountStateReadable && !input.requiredFinalUrlSuffixPresent) {
    redReasonCodes.push("FINAL_URL_SUFFIX_MISSING")
  }
  if (!input.stripeFeesComplete) {
    redReasonCodes.push("STRIPE_FEES_UNAVAILABLE")
  }

  if (input.googleDiagnosticsLagging) {
    amberReasonCodes.push("GOOGLE_DIAGNOSTICS_LAGGING")
  }
  if (input.conversionLagImmature) {
    amberReasonCodes.push("CONVERSION_LAG_IMMATURE")
  }

  const state = redReasonCodes.length > 0
    ? "RED"
    : amberReasonCodes.length > 0
      ? "AMBER"
      : "GREEN"

  return {
    evidenceAsOf: input.evidenceAsOf,
    reasonCodes: [...redReasonCodes, ...amberReasonCodes],
    scaleAllowed: state === "GREEN",
    state,
  }
}
