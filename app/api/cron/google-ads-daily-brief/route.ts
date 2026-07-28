import { NextRequest, NextResponse } from "next/server"

import {
  getAdsAccountState,
  type GoogleAdsAccountState,
} from "@/lib/ads-agent/account-state"
import { formatDailyAdsBrief } from "@/lib/ads-agent/brief"
import { evaluateAdsPolicy } from "@/lib/ads-agent/policy"
import {
  claimDailyAdsAgentRun,
  isSydneyDailyAdsBriefHour,
  markDailyAdsAgentRunDelivered,
  markDailyAdsAgentRunFailed,
  markDailyAdsAgentRunPrepared,
} from "@/lib/ads-agent/runs"
import { buildAdsAgentSnapshot } from "@/lib/ads-agent/snapshot"
import { resolveSydneyClosedDay } from "@/lib/ads-agent/time"
import { classifyTrackingHealth } from "@/lib/ads-agent/tracking-health"
import type { AdsAgentSnapshot } from "@/lib/ads-agent/types"
import {
  getGoogleAdsAdjustmentHealth,
  getGoogleAdsUploadStreamHealth,
} from "@/lib/analytics/google-ads-health"
import { getGoogleAdsPurchaseImportHealth } from "@/lib/analytics/google-ads-report"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { toError } from "@/lib/errors"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import {
  buildGoogleAdsPurchaseImportAlert,
  buildGoogleAdsUploadAuditSourceAnomalyAlert,
  buildGoogleAdsUploadPartialFailureAlert,
  buildGoogleAdsUploadStreamStalledAlert,
} from "@/lib/monitoring/google-ads-purchase-import-health"
import { sendGoogleAdsDailyBriefViaTelegram } from "@/lib/notifications/telegram"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const maxDuration = 300

const logger = createLogger("cron-google-ads-daily-brief")

const REQUIRED_FINAL_URL_SUFFIX = {
  adgroupid: "{adgroupid}",
  campaignid: "{campaignid}",
  creative: "{creative}",
  device: "{device}",
  keyword: "{keyword}",
  matchtype: "{matchtype}",
  network: "{network}",
  utm_id: "{campaignid}",
  utm_medium: "cpc",
  utm_source: "google",
} as const

function fulfilledValue<T>(
  result: PromiseSettledResult<T>,
): T | null {
  return result.status === "fulfilled" ? result.value : null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function hasRequiredFinalUrlSuffix(value: string | null): boolean {
  if (!value) return false
  const params = new URLSearchParams(value)
  return Object.entries(REQUIRED_FINAL_URL_SUFFIX).every(
    ([key, expected]) => params.get(key) === expected,
  )
}

function configuredPurchaseActionIsPrimary(
  state: GoogleAdsAccountState | null,
): boolean {
  const actionId = process.env.GOOGLE_ADS_CONVERSION_ACTION_PURCHASE
    ?.replace(/-/g, "")
  if (!state || !actionId || !/^\d+$/.test(actionId)) return false

  const configured = state.conversionActions.find(
    (resource) => resource.resourceName?.endsWith(`/conversionActions/${actionId}`),
  )
  const action = asRecord(configured?.values.conversionAction)
  return (
    action?.status === "ENABLED"
    && action.type === "UPLOAD_CLICKS"
    && action.primaryForGoal === true
    && action.includeInConversionsMetric !== false
  )
}

function browserOrGa4PurchaseIsPrimary(
  state: GoogleAdsAccountState | null,
): boolean {
  if (!state) return false

  return state.conversionActions.some((resource) => {
    const action = asRecord(resource.values.conversionAction)
    const name = typeof action?.name === "string"
      ? action.name.toLowerCase()
      : ""
    const isPurchase =
      action?.category === "PURCHASE" || name.includes("purchase")
    const isPrimary =
      action?.primaryForGoal === true
      || action?.includeInConversionsMetric === true
    return isPurchase && isPrimary && action?.type !== "UPLOAD_CLICKS"
  })
}

async function classifyDailyTracking(args: {
  now: Date
  snapshot: AdsAgentSnapshot
  supabase: ReturnType<typeof createServiceRoleClient>
}): Promise<AdsAgentSnapshot["tracking"]> {
  const [accountResult, purchaseResult, uploadResult, adjustmentResult] =
    await Promise.allSettled([
      getAdsAccountState({ now: args.now }),
      getGoogleAdsPurchaseImportHealth({
        now: args.now,
        supabase: args.supabase,
      }),
      getGoogleAdsUploadStreamHealth(args.supabase, { now: args.now }),
      getGoogleAdsAdjustmentHealth(args.supabase, { now: args.now }),
    ])

  const account = fulfilledValue(accountResult)
  const purchase = fulfilledValue(purchaseResult)
  const upload = fulfilledValue(uploadResult)
  const adjustment = fulfilledValue(adjustmentResult)
  const uploadStalled = upload
    ? buildGoogleAdsUploadStreamStalledAlert(upload)
    : null
  const uploadPartialFailure = upload
    ? buildGoogleAdsUploadPartialFailureAlert(upload)
    : null
  const auditSourceAnomaly = purchase
    ? buildGoogleAdsUploadAuditSourceAnomalyAlert(purchase)
    : null
  const purchaseAlert = purchase
    ? buildGoogleAdsPurchaseImportAlert(purchase)
    : null
  const productionUploadsHealthy =
    upload != null
    && !upload.queryFailed
    && uploadStalled == null
  const googleDiagnosticsLagging =
    productionUploadsHealthy
    && (
      purchaseAlert?.metric === "google_ads_purchase_imports_zero"
      || purchaseAlert?.metric
        === "google_ads_purchase_primary_conversions_zero"
    )
  const criticalHealthReadFailed =
    accountResult.status === "rejected"
    || purchaseResult.status === "rejected"
    || uploadResult.status === "rejected"
    || adjustmentResult.status === "rejected"
    || purchase?.queryErrors.length !== 0
    || upload?.queryFailed === true
    || adjustment?.queryFailed === true
  const nonLaggingPurchaseFailure =
    purchaseAlert != null && !googleDiagnosticsLagging
  const enabledCampaigns = args.snapshot.rolling30.filter(
    (campaign) => campaign.campaignStatus === "ENABLED",
  )

  return classifyTrackingHealth({
    autoTaggingEnabled: args.snapshot.account.autoTaggingEnabled === true,
    browserOrGa4PurchasePrimary: browserOrGa4PurchaseIsPrimary(account),
    conversionLagImmature: false,
    criticalInputsFresh: Object.values(args.snapshot.inputs).every(
      (input) => input.status === "fresh",
    ),
    criticalQueriesOk:
      !criticalHealthReadFailed && !nonLaggingPurchaseFailure,
    enabledCampaignCount: enabledCampaigns.length,
    evidenceAsOf: args.now.toISOString(),
    googleDiagnosticsLagging,
    localPaidOrders: upload?.paidOrders ?? purchase?.localOrders ?? 0,
    optionalAccountQueryFailed: false,
    primaryPurchaseActionOk:
      purchase?.preflightOk === true
      && configuredPurchaseActionIsPrimary(account),
    productionUploadWindowElapsed: true,
    productionUploadsHealthy,
    purchasePreflightOk: purchase?.preflightOk === true,
    requiredFinalUrlSuffixPresent: hasRequiredFinalUrlSuffix(
      args.snapshot.account.finalUrlSuffix,
    ),
    spendAvailable: enabledCampaigns.every(
      (campaign) => campaign.spendCents != null,
    ),
    stripeFeesComplete:
      args.snapshot.inputs.stripeFees?.status === "fresh",
    terminalClickAttributedAdjustmentFailures:
      adjustment?.terminalClickAttributedFailures ?? 0,
    uploadAuditHealthy:
      auditSourceAnomaly == null && uploadPartialFailure == null,
  })
}

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  if (process.env.VERCEL_ENV !== "production") {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "production_only",
    })
  }
  if (process.env.GOOGLE_ADS_AGENT_DAILY_BRIEF_ENABLED !== "true") {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "daily_brief_disabled",
    })
  }

  const now = new Date()
  const { reportDate } = resolveSydneyClosedDay(now)
  const shadowRequested = request.nextUrl.searchParams.get("shadow") === "1"
  const shadowAuthorized =
    shadowRequested
    && process.env.GOOGLE_ADS_AGENT_SHADOW_DRY_RUN_REPORT_DATE === reportDate
  if (!isSydneyDailyAdsBriefHour(now) && !shadowAuthorized) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: shadowRequested
        ? "shadow_date_not_authorized"
        : "outside_sydney_0900",
      timestamp: now.toISOString(),
    })
  }

  await recordCronHeartbeat("google-ads-daily-brief")

  const supabase = createServiceRoleClient()
  let runId: string | null = null
  let stage:
    | "claim"
    | "build"
    | "send"
    | "receipt" = "claim"

  try {
    const claim = await claimDailyAdsAgentRun({
      now,
      reportDate,
      supabase,
    })
    if (!claim.claimed) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: claim.reason,
        reportDate,
      })
    }
    runId = claim.run.id
    stage = "build"

    const baseSnapshot = await buildAdsAgentSnapshot({ now, supabase })
    const tracking = await classifyDailyTracking({
      now,
      snapshot: baseSnapshot,
      supabase,
    })
    const snapshot = { ...baseSnapshot, tracking }
    const recommendations = evaluateAdsPolicy(snapshot)
    const message = formatDailyAdsBrief(snapshot, recommendations)
    await markDailyAdsAgentRunPrepared({
      recommendations,
      runId,
      snapshot,
      supabase,
    })

    stage = "send"
    const { messageId } = await sendGoogleAdsDailyBriefViaTelegram(message)

    stage = "receipt"
    await markDailyAdsAgentRunDelivered({
      recommendations,
      runId,
      snapshot,
      supabase,
      telegramMessageId: messageId,
    })

    logger.info("Daily Google Ads brief delivered", {
      reportDate,
      trackingState: tracking.state,
    })
    return NextResponse.json({
      success: true,
      delivered: true,
      reportDate,
      trackingState: tracking.state,
    })
  } catch (error) {
    const err = toError(error)
    const errorCode = stage === "send"
      ? "telegram_send_failed"
      : stage === "receipt"
        ? "telegram_delivery_receipt_ambiguous"
        : stage === "claim"
          ? "daily_run_claim_failed"
          : "daily_brief_build_failed"

    if (runId) {
      try {
        await markDailyAdsAgentRunFailed({
          errorCode,
          runId,
          supabase,
        })
      } catch (receiptError) {
        logger.error("Could not persist failed Ads brief run", {
          error: toError(receiptError).message,
          errorCode,
        })
      }
    }

    logger.error("Daily Google Ads brief failed", {
      error: err.message,
      errorCode,
      reportDate,
    })
    captureCronError(err, {
      errorCode,
      jobName: "google-ads-daily-brief",
      reportDate,
    })
    return NextResponse.json(
      { error: "Daily Google Ads brief failed" },
      { status: 500 },
    )
  }
}
