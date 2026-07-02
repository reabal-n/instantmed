import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  GOOGLE_ADS_ADJUSTMENT_CONVERSION_MATCH_GRACE_HOURS,
  GOOGLE_ADS_CONVERSION_ADJUSTMENT_AUDIT_ACTION,
  runGoogleAdsConversionAdjustment,
} from "@/lib/analytics/google-ads-conversion-adjustments"

const mocks = vi.hoisted(() => ({
  fireGoogleAdsConversionAdjustment: vi.fn(),
  retrieveGoogleDataManagerRequestStatus: vi.fn(),
  sentryCaptureMessage: vi.fn(),
}))

vi.mock("@/lib/analytics/google-ads-conversion-api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/analytics/google-ads-conversion-api")>()),
  fireGoogleAdsConversionAdjustment: mocks.fireGoogleAdsConversionAdjustment,
}))

vi.mock("@/lib/analytics/google-ads-data-manager-api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/analytics/google-ads-data-manager-api")>()),
  retrieveGoogleDataManagerRequestStatus: mocks.retrieveGoogleDataManagerRequestStatus,
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: mocks.sentryCaptureMessage,
}))

type AuditRow = {
  action: string
  created_at?: string
  intake_id: string | null
  metadata: Record<string, unknown> | null
}

const CONVERSION_NOT_FOUND_ERROR =
  "conversionAdjustmentResult.adjustmentUploadError:CONVERSION_NOT_FOUND:The conversion was not found"

const PAST_GRACE_HOURS = GOOGLE_ADS_ADJUSTMENT_CONVERSION_MATCH_GRACE_HOURS + 24
const WITHIN_GRACE_HOURS = 1

function adjustmentSupabaseMock(existingAudits: AuditRow[] = []) {
  const inserted: Array<{ table: string; payload: unknown }> = []
  const supabase = {
    from: (table: string) => ({
      insert: async (payload: unknown) => {
        inserted.push({ table, payload })
        return { error: null }
      },
      select: () => ({
        eq: (column: string, value: string) => ({
          eq: (secondColumn: string, secondValue: string) => ({
            order: () => Promise.resolve({
              data: existingAudits.filter(
                (row) =>
                  row.action === value &&
                  row.intake_id === secondValue &&
                  column === "action" &&
                  secondColumn === "intake_id",
              ),
              error: null,
            }),
          }),
        }),
      }),
    }),
  }

  return { inserted, supabase }
}

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

function successfulPurchaseUpload(
  intakeId = "intake_123",
  options: { ageHours?: number; metadata?: Record<string, unknown> } = {},
): AuditRow {
  return {
    action: "google_ads_conversion_upload",
    created_at: hoursAgoIso(options.ageHours ?? PAST_GRACE_HOURS),
    intake_id: intakeId,
    metadata: {
      status: "success",
      upload_api: "data_manager_api",
      upload_identifier: "request-123",
      ...options.metadata,
    },
  }
}

describe("Google Ads conversion adjustments", () => {
  beforeEach(() => {
    mocks.fireGoogleAdsConversionAdjustment.mockReset()
    mocks.retrieveGoogleDataManagerRequestStatus.mockReset()
    mocks.sentryCaptureMessage.mockReset()
    mocks.retrieveGoogleDataManagerRequestStatus.mockResolvedValue({
      attempted: true,
      ok: true,
      status: "SUCCESS",
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("retracts a fully refunded paid conversion and audits the adjustment", async () => {
    mocks.fireGoogleAdsConversionAdjustment.mockResolvedValue({ attempted: true, ok: true })
    const { inserted, supabase } = adjustmentSupabaseMock([successfulPurchaseUpload()])

    const result = await runGoogleAdsConversionAdjustment({
      adjustmentDateTime: new Date("2026-07-01T01:30:00.000Z"),
      amountCents: 2495,
      intakeId: "intake_123",
      paymentStatus: "refunded",
      refundAmountCents: 2495,
      source: "stripe_charge_refunded",
      supabase: supabase as never,
    })

    expect(result).toMatchObject({ attempted: true, ok: true, status: "success" })
    expect(mocks.fireGoogleAdsConversionAdjustment).toHaveBeenCalledWith({
      adjustmentDateTime: new Date("2026-07-01T01:30:00.000Z"),
      adjustmentType: "RETRACTION",
      orderId: "intake_123",
    })
    expect(inserted).toHaveLength(1)
    expect(inserted[0]).toMatchObject({
      table: "audit_logs",
      payload: {
        action: GOOGLE_ADS_CONVERSION_ADJUSTMENT_AUDIT_ACTION,
        actor_type: "system",
        intake_id: "intake_123",
        metadata: expect.objectContaining({
          adjustment_type: "RETRACTION",
          amount_cents: 2495,
          refund_amount_cents: 2495,
          source: "stripe_charge_refunded",
          status: "success",
          target_net_value_cents: 0,
        }),
      },
    })
  })

  it("restates a partially refunded paid conversion to retained value", async () => {
    mocks.fireGoogleAdsConversionAdjustment.mockResolvedValue({ attempted: true, ok: true })
    const { supabase } = adjustmentSupabaseMock([successfulPurchaseUpload()])

    await runGoogleAdsConversionAdjustment({
      amountCents: 4995,
      intakeId: "intake_123",
      paymentStatus: "partially_refunded",
      refundAmountCents: 2000,
      source: "stripe_charge_refunded",
      supabase: supabase as never,
    })

    expect(mocks.fireGoogleAdsConversionAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        adjustedValue: 29.95,
        adjustmentType: "RESTATEMENT",
        orderId: "intake_123",
      }),
    )
  })

  it("retracts a disputed conversion even when no refund amount exists yet", async () => {
    mocks.fireGoogleAdsConversionAdjustment.mockResolvedValue({ attempted: true, ok: true })
    const { supabase } = adjustmentSupabaseMock([successfulPurchaseUpload()])

    await runGoogleAdsConversionAdjustment({
      amountCents: 4995,
      intakeId: "intake_123",
      paymentStatus: "disputed",
      refundAmountCents: 0,
      source: "stripe_charge_dispute_created",
      supabase: supabase as never,
    })

    expect(mocks.fireGoogleAdsConversionAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        adjustmentType: "RETRACTION",
        orderId: "intake_123",
      }),
    )
  })

  it("waits for a successful purchase upload before adjusting", async () => {
    const { inserted, supabase } = adjustmentSupabaseMock([])

    const result = await runGoogleAdsConversionAdjustment({
      amountCents: 2495,
      intakeId: "intake_missing_upload",
      paymentStatus: "refunded",
      refundAmountCents: 2495,
      source: "cron_backfill",
      supabase: supabase as never,
    })

    expect(result).toMatchObject({
      attempted: false,
      error: "missing_successful_purchase_upload",
      status: "skipped_missing_successful_upload",
    })
    expect(mocks.fireGoogleAdsConversionAdjustment).not.toHaveBeenCalled()
    expect(inserted[0]).toMatchObject({
      payload: {
        metadata: expect.objectContaining({
          has_successful_purchase_upload: false,
          status: "skipped_missing_successful_upload",
        }),
      },
    })
  })

  it("records the missing-upload skip once instead of once per cron run", async () => {
    const { inserted, supabase } = adjustmentSupabaseMock([
      {
        action: GOOGLE_ADS_CONVERSION_ADJUSTMENT_AUDIT_ACTION,
        created_at: hoursAgoIso(2),
        intake_id: "intake_missing_upload",
        metadata: {
          adjustment_type: "RETRACTION",
          status: "skipped_missing_successful_upload",
          target_net_value_cents: 0,
        },
      },
    ])

    const result = await runGoogleAdsConversionAdjustment({
      amountCents: 2495,
      intakeId: "intake_missing_upload",
      paymentStatus: "refunded",
      refundAmountCents: 2495,
      source: "cron_backfill",
      supabase: supabase as never,
    })

    expect(result).toMatchObject({
      attempted: false,
      status: "skipped_missing_successful_upload",
    })
    expect(mocks.fireGoogleAdsConversionAdjustment).not.toHaveBeenCalled()
    expect(inserted).toHaveLength(0)
  })

  it("dedupes an already successful matching adjustment", async () => {
    const { inserted, supabase } = adjustmentSupabaseMock([
      successfulPurchaseUpload(),
      {
        action: GOOGLE_ADS_CONVERSION_ADJUSTMENT_AUDIT_ACTION,
        created_at: "2026-07-01T02:00:00.000Z",
        intake_id: "intake_123",
        metadata: {
          adjustment_type: "RESTATEMENT",
          status: "success",
          target_net_value_cents: 2995,
        },
      },
    ])

    const result = await runGoogleAdsConversionAdjustment({
      amountCents: 4995,
      intakeId: "intake_123",
      paymentStatus: "partially_refunded",
      refundAmountCents: 2000,
      source: "cron_backfill",
      supabase: supabase as never,
    })

    expect(result).toMatchObject({
      attempted: false,
      status: "skipped_already_adjusted",
    })
    expect(mocks.fireGoogleAdsConversionAdjustment).not.toHaveBeenCalled()
    expect(inserted).toHaveLength(0)
  })

  it("records conversion-not-found failures as terminal once the upload is past the match grace window", async () => {
    mocks.fireGoogleAdsConversionAdjustment.mockResolvedValue({
      attempted: true,
      error: CONVERSION_NOT_FOUND_ERROR,
      ok: false,
    })
    const { inserted, supabase } = adjustmentSupabaseMock([
      successfulPurchaseUpload("intake_123", { ageHours: PAST_GRACE_HOURS }),
    ])

    const result = await runGoogleAdsConversionAdjustment({
      amountCents: 2495,
      intakeId: "intake_123",
      paymentStatus: "refunded",
      refundAmountCents: 2495,
      source: "cron_backfill",
      supabase: supabase as never,
    })

    expect(result).toMatchObject({
      attempted: true,
      ok: false,
      status: "terminal_failed",
    })
    expect(inserted[0]).toMatchObject({
      payload: {
        metadata: expect.objectContaining({
          error_code: CONVERSION_NOT_FOUND_ERROR,
          status: "terminal_failed",
          terminal: true,
          terminal_reason: "conversion_not_found",
        }),
      },
    })
  })

  it("keeps conversion-not-found transient while the upload is inside the match grace window", async () => {
    mocks.fireGoogleAdsConversionAdjustment.mockResolvedValue({
      attempted: true,
      error: CONVERSION_NOT_FOUND_ERROR,
      ok: false,
    })
    const { inserted, supabase } = adjustmentSupabaseMock([
      successfulPurchaseUpload("intake_123", { ageHours: WITHIN_GRACE_HOURS }),
    ])

    const result = await runGoogleAdsConversionAdjustment({
      amountCents: 2495,
      intakeId: "intake_123",
      paymentStatus: "refunded",
      refundAmountCents: 2495,
      source: "stripe_charge_refunded",
      supabase: supabase as never,
    })

    expect(result).toMatchObject({
      attempted: true,
      ok: false,
      status: "failed",
    })
    expect(inserted[0]).toMatchObject({
      payload: {
        metadata: expect.objectContaining({
          error_code: CONVERSION_NOT_FOUND_ERROR,
          status: "failed",
          terminal: false,
          terminal_reason: null,
        }),
      },
    })
    expect(mocks.sentryCaptureMessage).not.toHaveBeenCalled()
  })

  it("retries a conversion-not-found failure recorded inside the grace window", async () => {
    mocks.fireGoogleAdsConversionAdjustment.mockResolvedValue({ attempted: true, ok: true })
    const { supabase } = adjustmentSupabaseMock([
      successfulPurchaseUpload("intake_123", { ageHours: WITHIN_GRACE_HOURS }),
      {
        action: GOOGLE_ADS_CONVERSION_ADJUSTMENT_AUDIT_ACTION,
        created_at: hoursAgoIso(0.5),
        intake_id: "intake_123",
        metadata: {
          adjustment_type: "RETRACTION",
          error_code: CONVERSION_NOT_FOUND_ERROR,
          status: "failed",
          target_net_value_cents: 0,
        },
      },
    ])

    const result = await runGoogleAdsConversionAdjustment({
      amountCents: 2495,
      intakeId: "intake_123",
      paymentStatus: "refunded",
      refundAmountCents: 2495,
      source: "cron_backfill",
      supabase: supabase as never,
    })

    expect(result).toMatchObject({ attempted: true, ok: true, status: "success" })
    expect(mocks.fireGoogleAdsConversionAdjustment).toHaveBeenCalledTimes(1)
  })

  it("retries past an early terminal conversion-not-found row while still inside the grace window", async () => {
    mocks.fireGoogleAdsConversionAdjustment.mockResolvedValue({ attempted: true, ok: true })
    const { supabase } = adjustmentSupabaseMock([
      successfulPurchaseUpload("intake_123", { ageHours: WITHIN_GRACE_HOURS }),
      {
        action: GOOGLE_ADS_CONVERSION_ADJUSTMENT_AUDIT_ACTION,
        created_at: hoursAgoIso(0.5),
        intake_id: "intake_123",
        metadata: {
          adjustment_type: "RETRACTION",
          error_code: CONVERSION_NOT_FOUND_ERROR,
          status: "terminal_failed",
          target_net_value_cents: 0,
          terminal: true,
          terminal_reason: "conversion_not_found",
        },
      },
    ])

    const result = await runGoogleAdsConversionAdjustment({
      amountCents: 2495,
      intakeId: "intake_123",
      paymentStatus: "refunded",
      refundAmountCents: 2495,
      source: "cron_backfill",
      supabase: supabase as never,
    })

    expect(result).toMatchObject({ attempted: true, ok: true, status: "success" })
    expect(mocks.fireGoogleAdsConversionAdjustment).toHaveBeenCalledTimes(1)
  })

  it("does not retry a matching terminal adjustment failure once past the grace window", async () => {
    const { inserted, supabase } = adjustmentSupabaseMock([
      successfulPurchaseUpload("intake_123", { ageHours: PAST_GRACE_HOURS }),
      {
        action: GOOGLE_ADS_CONVERSION_ADJUSTMENT_AUDIT_ACTION,
        created_at: "2026-07-01T02:00:00.000Z",
        intake_id: "intake_123",
        metadata: {
          adjustment_type: "RETRACTION",
          error_code: CONVERSION_NOT_FOUND_ERROR,
          status: "failed",
          target_net_value_cents: 0,
        },
      },
    ])

    const result = await runGoogleAdsConversionAdjustment({
      amountCents: 2495,
      intakeId: "intake_123",
      paymentStatus: "refunded",
      refundAmountCents: 2495,
      source: "cron_backfill",
      supabase: supabase as never,
    })

    expect(result).toMatchObject({
      attempted: false,
      status: "skipped_terminal_error",
    })
    expect(mocks.fireGoogleAdsConversionAdjustment).not.toHaveBeenCalled()
    expect(inserted).toHaveLength(0)
  })

  it("blocks non-conversion-not-found terminal rows regardless of upload age", async () => {
    const { supabase } = adjustmentSupabaseMock([
      successfulPurchaseUpload("intake_123", { ageHours: WITHIN_GRACE_HOURS }),
      {
        action: GOOGLE_ADS_CONVERSION_ADJUSTMENT_AUDIT_ACTION,
        created_at: hoursAgoIso(0.5),
        intake_id: "intake_123",
        metadata: {
          adjustment_type: "RETRACTION",
          error_code: "dm_request_rejected",
          status: "terminal_failed",
          target_net_value_cents: 0,
          terminal: true,
          terminal_reason: "dm_request_rejected",
        },
      },
    ])

    const result = await runGoogleAdsConversionAdjustment({
      amountCents: 2495,
      intakeId: "intake_123",
      paymentStatus: "refunded",
      refundAmountCents: 2495,
      source: "cron_backfill",
      supabase: supabase as never,
    })

    expect(result).toMatchObject({
      attempted: false,
      status: "skipped_terminal_error",
    })
    expect(mocks.fireGoogleAdsConversionAdjustment).not.toHaveBeenCalled()
  })

  it("short-circuits terminally when the Data Manager ingest was rejected", async () => {
    mocks.retrieveGoogleDataManagerRequestStatus.mockResolvedValue({
      attempted: true,
      ok: true,
      status: "FAILED",
    })
    const { inserted, supabase } = adjustmentSupabaseMock([
      successfulPurchaseUpload("intake_123", { metadata: { has_gclid: true } }),
    ])

    const result = await runGoogleAdsConversionAdjustment({
      amountCents: 2495,
      intakeId: "intake_123",
      paymentStatus: "refunded",
      refundAmountCents: 2495,
      source: "cron_backfill",
      supabase: supabase as never,
    })

    expect(result).toMatchObject({
      attempted: false,
      error: "dm_request_rejected",
      status: "terminal_failed",
    })
    expect(mocks.retrieveGoogleDataManagerRequestStatus).toHaveBeenCalledWith("request-123")
    expect(mocks.fireGoogleAdsConversionAdjustment).not.toHaveBeenCalled()
    expect(inserted[0]).toMatchObject({
      payload: {
        metadata: expect.objectContaining({
          error_code: "dm_request_rejected",
          status: "terminal_failed",
          terminal: true,
          terminal_reason: "dm_request_rejected",
          upload_api: "data_manager_api",
          upload_identifier: "request-123",
        }),
      },
    })
    // A rejected ingest means the conversion never counted, so no alarm.
    expect(mocks.sentryCaptureMessage).not.toHaveBeenCalled()
  })

  it("waits without attempting while the Data Manager ingest is still processing", async () => {
    mocks.retrieveGoogleDataManagerRequestStatus.mockResolvedValue({
      attempted: true,
      ok: true,
      status: "PROCESSING",
    })
    const { inserted, supabase } = adjustmentSupabaseMock([successfulPurchaseUpload()])

    const result = await runGoogleAdsConversionAdjustment({
      amountCents: 2495,
      intakeId: "intake_123",
      paymentStatus: "refunded",
      refundAmountCents: 2495,
      source: "cron_backfill",
      supabase: supabase as never,
    })

    expect(result).toMatchObject({
      attempted: false,
      error: "dm_request_processing",
      status: "failed",
    })
    expect(mocks.fireGoogleAdsConversionAdjustment).not.toHaveBeenCalled()
    expect(inserted[0]).toMatchObject({
      payload: {
        metadata: expect.objectContaining({
          error_code: "dm_request_processing",
          status: "failed",
          terminal: false,
        }),
      },
    })
  })

  it("proceeds with the Google Ads adjustment when the Data Manager status lookup fails", async () => {
    mocks.retrieveGoogleDataManagerRequestStatus.mockResolvedValue({
      attempted: true,
      ok: false,
      error: "http_500",
    })
    mocks.fireGoogleAdsConversionAdjustment.mockResolvedValue({ attempted: true, ok: true })
    const { supabase } = adjustmentSupabaseMock([successfulPurchaseUpload()])

    const result = await runGoogleAdsConversionAdjustment({
      amountCents: 2495,
      intakeId: "intake_123",
      paymentStatus: "refunded",
      refundAmountCents: 2495,
      source: "cron_backfill",
      supabase: supabase as never,
    })

    expect(result).toMatchObject({ attempted: true, ok: true, status: "success" })
    expect(mocks.fireGoogleAdsConversionAdjustment).toHaveBeenCalledTimes(1)
  })

  it("skips the Data Manager status lookup for legacy Google Ads API uploads", async () => {
    mocks.fireGoogleAdsConversionAdjustment.mockResolvedValue({ attempted: true, ok: true })
    const { supabase } = adjustmentSupabaseMock([
      successfulPurchaseUpload("intake_123", {
        metadata: { upload_api: null, upload_identifier: null },
      }),
    ])

    const result = await runGoogleAdsConversionAdjustment({
      amountCents: 2495,
      intakeId: "intake_123",
      paymentStatus: "refunded",
      refundAmountCents: 2495,
      source: "cron_backfill",
      supabase: supabase as never,
    })

    expect(result).toMatchObject({ attempted: true, ok: true, status: "success" })
    expect(mocks.retrieveGoogleDataManagerRequestStatus).not.toHaveBeenCalled()
  })

  it("alarms once when a click-attributed retraction fails terminally", async () => {
    mocks.fireGoogleAdsConversionAdjustment.mockResolvedValue({
      attempted: true,
      error: CONVERSION_NOT_FOUND_ERROR,
      ok: false,
    })
    const { supabase } = adjustmentSupabaseMock([
      successfulPurchaseUpload("intake_123", {
        ageHours: PAST_GRACE_HOURS,
        metadata: { has_gclid: true },
      }),
    ])

    const result = await runGoogleAdsConversionAdjustment({
      amountCents: 2495,
      intakeId: "intake_123",
      paymentStatus: "refunded",
      refundAmountCents: 2495,
      source: "cron_backfill",
      supabase: supabase as never,
    })

    expect(result).toMatchObject({ status: "terminal_failed" })
    expect(mocks.sentryCaptureMessage).toHaveBeenCalledTimes(1)
    expect(mocks.sentryCaptureMessage).toHaveBeenCalledWith(
      "Google Ads retraction permanently failed for a click-attributed conversion",
      expect.objectContaining({
        level: "error",
        fingerprint: ["google-ads-retraction-terminal", "intake_123"],
      }),
    )
  })

  it("stays silent when a user-data-only retraction fails terminally", async () => {
    mocks.fireGoogleAdsConversionAdjustment.mockResolvedValue({
      attempted: true,
      error: CONVERSION_NOT_FOUND_ERROR,
      ok: false,
    })
    const { supabase } = adjustmentSupabaseMock([
      successfulPurchaseUpload("intake_123", {
        ageHours: PAST_GRACE_HOURS,
        metadata: { has_gclid: false, has_gbraid: false, has_wbraid: false },
      }),
    ])

    const result = await runGoogleAdsConversionAdjustment({
      amountCents: 2495,
      intakeId: "intake_123",
      paymentStatus: "refunded",
      refundAmountCents: 2495,
      source: "cron_backfill",
      supabase: supabase as never,
    })

    expect(result).toMatchObject({ status: "terminal_failed" })
    expect(mocks.sentryCaptureMessage).not.toHaveBeenCalled()
  })

  it("skips audit writes from local development runtimes", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("VERCEL", "0")
    mocks.fireGoogleAdsConversionAdjustment.mockResolvedValue({ attempted: true, ok: true })
    const { inserted, supabase } = adjustmentSupabaseMock([successfulPurchaseUpload()])

    const result = await runGoogleAdsConversionAdjustment({
      amountCents: 2495,
      intakeId: "intake_123",
      paymentStatus: "refunded",
      refundAmountCents: 2495,
      source: "cron_backfill",
      supabase: supabase as never,
    })

    expect(result).toMatchObject({ attempted: true, ok: true, status: "success" })
    expect(mocks.fireGoogleAdsConversionAdjustment).toHaveBeenCalled()
    expect(inserted).toHaveLength(0)
  })
})
