import { readFileSync } from "node:fs"
import { join } from "node:path"

import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  buildAdsAgentSnapshot: vi.fn(),
  claimDailyAdsAgentRun: vi.fn(),
  getAdsAccountState: vi.fn(),
  getGoogleAdsAdjustmentHealth: vi.fn(),
  getGoogleAdsPurchaseImportHealth: vi.fn(),
  getGoogleAdsUploadStreamHealth: vi.fn(),
  markDailyAdsAgentRunDelivered: vi.fn(),
  markDailyAdsAgentRunFailed: vi.fn(),
  markDailyAdsAgentRunPrepared: vi.fn(),
  recordCronHeartbeat: vi.fn(),
  sendGoogleAdsDailyBriefViaTelegram: vi.fn(),
  verifyCronRequest: vi.fn(),
}))

vi.mock("@/lib/ads-agent/account-state", () => ({
  getAdsAccountState: mocks.getAdsAccountState,
}))

vi.mock("@/lib/ads-agent/runs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ads-agent/runs")>()
  return {
    ...actual,
    claimDailyAdsAgentRun: mocks.claimDailyAdsAgentRun,
    markDailyAdsAgentRunDelivered: mocks.markDailyAdsAgentRunDelivered,
    markDailyAdsAgentRunFailed: mocks.markDailyAdsAgentRunFailed,
    markDailyAdsAgentRunPrepared: mocks.markDailyAdsAgentRunPrepared,
  }
})

vi.mock("@/lib/ads-agent/snapshot", () => ({
  buildAdsAgentSnapshot: mocks.buildAdsAgentSnapshot,
}))

vi.mock("@/lib/analytics/google-ads-health", () => ({
  getGoogleAdsAdjustmentHealth: mocks.getGoogleAdsAdjustmentHealth,
  getGoogleAdsUploadStreamHealth: mocks.getGoogleAdsUploadStreamHealth,
}))

vi.mock("@/lib/analytics/google-ads-report", () => ({
  getGoogleAdsPurchaseImportHealth: mocks.getGoogleAdsPurchaseImportHealth,
}))

vi.mock("@/lib/api/cron-auth", () => ({
  verifyCronRequest: mocks.verifyCronRequest,
}))

vi.mock("@/lib/monitoring/cron-heartbeat", () => ({
  recordCronHeartbeat: mocks.recordCronHeartbeat,
}))

vi.mock("@/lib/notifications/telegram", () => ({
  sendGoogleAdsDailyBriefViaTelegram:
    mocks.sendGoogleAdsDailyBriefViaTelegram,
}))

vi.mock("@/lib/observability/sentry", () => ({
  captureCronError: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({ kind: "service-role" }),
}))

import { GET } from "@/app/api/cron/google-ads-daily-brief/route"
import {
  getExistingRunClaimDisposition,
  isSydneyDailyAdsBriefHour,
} from "@/lib/ads-agent/runs"

const originalEnv = { ...process.env }
const request = new NextRequest(
  "https://instantmed.test/api/cron/google-ads-daily-brief",
)
const shadowRequest = new NextRequest(
  "https://instantmed.test/api/cron/google-ads-daily-brief?shadow=1",
)

const snapshot = {
  account: {
    accountHash: "a".repeat(64),
    asOf: "2026-07-27T23:00:00.000Z",
    autoTaggingEnabled: true,
    dailyBudgetTotalCents: 4000,
    finalUrlSuffix:
      "utm_source=google&utm_medium=cpc&utm_id={campaignid}&campaignid={campaignid}&adgroupid={adgroupid}&keyword={keyword}&creative={creative}&matchtype={matchtype}&device={device}&network={network}",
    lastChangeActor: null,
    lastChangeAt: null,
  },
  daily: [],
  generatedAt: "2026-07-27T23:00:00.000Z",
  inputs: {
    accountState: {
      asOf: "2026-07-27T23:00:00.000Z",
      status: "fresh",
    },
    googleAdsRolling30: {
      asOf: "2026-07-27T23:00:00.000Z",
      status: "fresh",
    },
    stripeFees: {
      asOf: "2026-07-27T23:00:00.000Z",
      status: "fresh",
    },
  },
  reportDate: "2026-07-27",
  rolling30: [],
  totals: {
    daily: {
      enabled: {
        campaignCount: 0,
        contributionCents: 0,
        contributionMargin: null,
        grossRevenueCents: 0,
        netRetainedRevenueCents: 0,
        orders: 0,
        refundCents: 0,
        refundedOrders: 0,
        refundRate: null,
        spendCents: 0,
        stripeFeeCents: 0,
        unavailableReasonCodes: [],
      },
      other: { campaignCount: 0 },
      paused: { campaignCount: 0 },
    },
    rolling30: {
      enabled: {
        campaignCount: 0,
        contributionCents: 0,
        contributionMargin: null,
        grossRevenueCents: 0,
        netRetainedRevenueCents: 0,
        orders: 0,
        refundCents: 0,
        refundedOrders: 0,
        refundRate: null,
        spendCents: 0,
        stripeFeeCents: 0,
        unavailableReasonCodes: [],
      },
      other: { campaignCount: 0 },
      paused: { campaignCount: 0 },
    },
  },
  tracking: {
    evidenceAsOf: "2026-07-27T23:00:00.000Z",
    reasonCodes: ["TRACKING_HEALTH_NOT_CLASSIFIED"],
    scaleAllowed: false,
    state: "RED",
  },
  windows: {
    daily: {
      endDate: "2026-07-27",
      endUtcExclusive: "2026-07-27T14:00:00.000Z",
      startDate: "2026-07-27",
      startUtc: "2026-07-26T14:00:00.000Z",
    },
    rolling30: {
      endDate: "2026-07-27",
      endUtcExclusive: "2026-07-27T14:00:00.000Z",
      startDate: "2026-06-28",
      startUtc: "2026-06-27T14:00:00.000Z",
    },
  },
}

describe("Google Ads Agent cron timing and idempotency", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    process.env.VERCEL_ENV = "production"
    process.env.GOOGLE_ADS_AGENT_DAILY_BRIEF_ENABLED = "true"
    delete process.env.GOOGLE_ADS_AGENT_SHADOW_DRY_RUN_REPORT_DATE
    process.env.GOOGLE_ADS_CONVERSION_ACTION_PURCHASE = "111"
    mocks.verifyCronRequest.mockReturnValue(null)
    mocks.claimDailyAdsAgentRun.mockResolvedValue({
      claimed: true,
      run: {
        id: "run-1",
        reportDate: "2026-07-27",
        status: "running",
      },
    })
    mocks.buildAdsAgentSnapshot.mockResolvedValue(snapshot)
    mocks.getAdsAccountState.mockResolvedValue({
      optionalQueryFailures: [],
      conversionActions: [{
        resourceName: "customers/123/conversionActions/111",
        values: {
          conversionAction: {
            category: "PURCHASE",
            includeInConversionsMetric: true,
            primaryForGoal: true,
            status: "ENABLED",
            type: "UPLOAD_CLICKS",
          },
        },
      }],
    })
    mocks.getGoogleAdsPurchaseImportHealth.mockResolvedValue({
      acceptedCustomerDataTerms: true,
      enhancedConversionsForLeadsEnabled: true,
      generatedAt: "2026-07-27T23:00:00.000Z",
      localNetRevenueAud: 0,
      localOrders: 0,
      preflightOk: true,
      purchaseAllConversions: 0,
      purchaseAllConversionsValueAud: 0,
      purchaseConversions: 0,
      purchaseConversionValueAud: 0,
      queryErrors: [],
      rangeDays: 30,
      uploadAuditReconciliation: null,
    })
    mocks.getGoogleAdsUploadStreamHealth.mockResolvedValue({
      dataManagerSuccesses: 0,
      failedUploads: 0,
      generatedAt: "2026-07-27T23:00:00.000Z",
      latestFailedAt: null,
      latestFailureCode: null,
      lastSuccessfulUploadAt: null,
      legacySuccesses: 0,
      lookbackDays: 3,
      paidOrders: 0,
      queryFailed: false,
      successfulUploads: 0,
    })
    mocks.getGoogleAdsAdjustmentHealth.mockResolvedValue({
      adjustmentFailureRows: 0,
      clickAttributedFailures: 0,
      confirmedNotCounted: 0,
      dedupedFailedIntakes: 0,
      failedIntakesWithoutSuccessfulUpload: 0,
      generatedAt: "2026-07-27T23:00:00.000Z",
      latestFailureAt: null,
      latestPageableFailureAt: null,
      lookbackDays: 90,
      queryFailed: false,
      terminalClickAttributedFailures: 0,
      terminalFailures: 0,
      terminalNonClickAttributedFailures: 0,
      transientFailures: 0,
    })
    mocks.sendGoogleAdsDailyBriefViaTelegram.mockResolvedValue({
      messageId: 9042,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    process.env = { ...originalEnv }
  })

  it("accepts the full 09:00 Sydney hour across AEST and AEDT", () => {
    expect(
      isSydneyDailyAdsBriefHour(new Date("2026-07-27T23:00:00.000Z")),
    ).toBe(true)
    expect(
      isSydneyDailyAdsBriefHour(new Date("2026-07-27T23:59:59.999Z")),
    ).toBe(true)
    expect(
      isSydneyDailyAdsBriefHour(new Date("2026-01-27T22:00:00.000Z")),
    ).toBe(true)
    expect(
      isSydneyDailyAdsBriefHour(new Date("2026-01-27T22:59:59.999Z")),
    ).toBe(true)
    expect(
      isSydneyDailyAdsBriefHour(new Date("2026-07-27T22:00:00.000Z")),
    ).toBe(false)
    expect(
      isSydneyDailyAdsBriefHour(new Date("2026-01-27T23:00:00.000Z")),
    ).toBe(false)
  })

  it("retries a failed run but skips a delivered or actively-running run", () => {
    const now = new Date("2026-07-27T23:00:00.000Z")

    expect(getExistingRunClaimDisposition({
      startedAt: "2026-07-27T22:00:00.000Z",
      status: "failed",
    }, now)).toBe("retry")
    expect(getExistingRunClaimDisposition({
      startedAt: "2026-07-27T22:00:00.000Z",
      status: "delivered",
    }, now)).toBe("skip_delivered")
    expect(getExistingRunClaimDisposition({
      startedAt: "2026-07-27T22:55:00.000Z",
      status: "running",
    }, now)).toBe("skip_running")
    expect(getExistingRunClaimDisposition({
      errorCode: "telegram_delivery_receipt_ambiguous",
      startedAt: "2026-07-27T22:00:00.000Z",
      status: "failed",
    }, now)).toBe("skip_ambiguous")
  })

  it("records one delivered run with the Telegram message-id receipt", async () => {
    vi.setSystemTime(new Date("2026-07-27T23:00:00.000Z"))

    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mocks.claimDailyAdsAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({ reportDate: "2026-07-27" }),
    )
    expect(mocks.sendGoogleAdsDailyBriefViaTelegram).toHaveBeenCalledOnce()
    expect(mocks.markDailyAdsAgentRunDelivered).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "run-1",
        telegramMessageId: 9042,
      }),
    )
    expect(await response.json()).toMatchObject({
      delivered: true,
      reportDate: "2026-07-27",
      success: true,
    })
  })

  it("skips work after the report date is already delivered", async () => {
    vi.setSystemTime(new Date("2026-07-27T23:00:00.000Z"))
    mocks.claimDailyAdsAgentRun.mockResolvedValue({
      claimed: false,
      reason: "already_delivered",
      run: {
        id: "run-1",
        reportDate: "2026-07-27",
        status: "delivered",
      },
    })

    const response = await GET(request)

    expect(await response.json()).toMatchObject({
      skipped: true,
      reason: "already_delivered",
    })
    expect(mocks.buildAdsAgentSnapshot).not.toHaveBeenCalled()
    expect(mocks.sendGoogleAdsDailyBriefViaTelegram).not.toHaveBeenCalled()
  })

  it("marks a failed send for a later retry", async () => {
    vi.setSystemTime(new Date("2026-07-27T23:00:00.000Z"))
    mocks.sendGoogleAdsDailyBriefViaTelegram.mockRejectedValue(
      new Error("telegram_unavailable"),
    )

    const response = await GET(request)

    expect(response.status).toBe(500)
    expect(mocks.markDailyAdsAgentRunFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "telegram_send_failed",
        runId: "run-1",
      }),
    )
  })

  it("does not deliver outside production or when the feature flag is false", async () => {
    vi.setSystemTime(new Date("2026-07-27T23:00:00.000Z"))
    process.env.VERCEL_ENV = "preview"

    const previewResponse = await GET(request)
    expect(await previewResponse.json()).toMatchObject({
      skipped: true,
      reason: "production_only",
    })

    process.env.VERCEL_ENV = "production"
    process.env.GOOGLE_ADS_AGENT_DAILY_BRIEF_ENABLED = "false"
    const disabledResponse = await GET(request)
    expect(await disabledResponse.json()).toMatchObject({
      skipped: true,
      reason: "daily_brief_disabled",
    })
    expect(mocks.sendGoogleAdsDailyBriefViaTelegram).not.toHaveBeenCalled()
  })

  it("skips the UTC invocation that is not local 09:00", async () => {
    vi.setSystemTime(new Date("2026-07-27T22:00:00.000Z"))

    const response = await GET(request)

    expect(await response.json()).toMatchObject({
      skipped: true,
      reason: "outside_sydney_0900",
    })
    expect(mocks.claimDailyAdsAgentRun).not.toHaveBeenCalled()
  })

  it("allows one date-bound shadow run outside 09:00 without a reusable force switch", async () => {
    vi.setSystemTime(new Date("2026-07-27T04:00:00.000Z"))
    process.env.GOOGLE_ADS_AGENT_SHADOW_DRY_RUN_REPORT_DATE = "2026-07-26"

    const response = await GET(shadowRequest)

    expect(await response.json()).toMatchObject({
      delivered: true,
      reportDate: "2026-07-26",
      success: true,
    })
    expect(mocks.claimDailyAdsAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({ reportDate: "2026-07-26" }),
    )
    expect(mocks.sendGoogleAdsDailyBriefViaTelegram).toHaveBeenCalledOnce()

    vi.clearAllMocks()
    process.env.GOOGLE_ADS_AGENT_SHADOW_DRY_RUN_REPORT_DATE = "2026-07-25"
    const denied = await GET(shadowRequest)
    expect(await denied.json()).toMatchObject({
      reason: "shadow_date_not_authorized",
      skipped: true,
    })
    expect(mocks.claimDailyAdsAgentRun).not.toHaveBeenCalled()
  })
})

describe("Google Ads Agent cron deployment contract", () => {
  it("pins both DST-safe UTC invocations, daily heartbeat, and unique report date", () => {
    const vercel = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    )
    const heartbeat = readFileSync(
      join(process.cwd(), "lib/monitoring/cron-heartbeat.ts"),
      "utf8",
    )
    const migration = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260727180000_google_ads_agent_control_plane.sql",
      ),
      "utf8",
    )

    expect(vercel.crons).toContainEqual({
      path: "/api/cron/google-ads-daily-brief",
      schedule: "0 22,23 * * *",
    })
    expect(heartbeat).toContain('"google-ads-daily-brief"')
    expect(migration).toContain("report_date date not null unique")
  })
})
