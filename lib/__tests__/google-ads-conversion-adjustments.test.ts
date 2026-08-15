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

function adjustmentSupabaseMock(
  existingAudits: AuditRow[] = [],
  options: { reservationError?: string } = {},
) {
  const inserted: Array<{ table: string; payload: unknown }> = []
  const latestDefinitiveAdjustment = existingAudits
    .filter((row) =>
      row.action === GOOGLE_ADS_CONVERSION_ADJUSTMENT_AUDIT_ACTION &&
      ["success", "resolved_not_counted", "terminal_failed"].includes(
        String(row.metadata?.status),
      ) && !(
        row.metadata?.status === "terminal_failed" &&
        (
          row.metadata?.terminal_reason === "conversion_not_found" ||
          String(row.metadata?.error_code).includes("CONVERSION_NOT_FOUND")
        )
      ),
    )
    .sort((left, right) => Date.parse(right.created_at || "") - Date.parse(left.created_at || ""))[0]
  let claimState:
    | "available"
    | "reserved"
    | "resolved_not_counted"
    | "succeeded"
    | "terminal_failed"
    | "unknown_outcome" = latestDefinitiveAdjustment?.metadata?.status === "success"
      ? "succeeded"
      : latestDefinitiveAdjustment?.metadata?.status === "resolved_not_counted"
        ? "resolved_not_counted"
        : latestDefinitiveAdjustment?.metadata?.status === "terminal_failed"
          ? "terminal_failed"
          : "available"
  let lastTarget = Number.isInteger(latestDefinitiveAdjustment?.metadata?.target_net_value_cents)
    ? Number(latestDefinitiveAdjustment?.metadata?.target_net_value_cents)
    : null
  const rpc = vi.fn(async (name: string, params?: Record<string, unknown>) => {
    if (name === "reserve_google_ads_conversion_adjustment") {
      if (options.reservationError) {
        return { data: null, error: { message: options.reservationError } }
      }
      const target = Number(params?.p_target_net_value_cents)
      if (lastTarget !== null && target !== lastTarget && claimState !== "reserved") {
        claimState = "available"
      }
      if (claimState !== "available") {
        return { data: { reserved: false, state: claimState }, error: null }
      }
      lastTarget = target
      claimState = "reserved"
      return {
        data: {
          adjustment_at: params?.p_adjustment_at,
          claim_id: "11111111-1111-1111-1111-111111111111",
          lease_token: "22222222-2222-2222-2222-222222222222",
          reserved: true,
          state: "reserved",
        },
        error: null,
      }
    }
    if (name === "complete_google_ads_conversion_adjustment_claim") {
      const outcome = params?.p_outcome
      claimState = outcome === "succeeded"
        ? "succeeded"
        : outcome === "resolved_not_counted"
          ? "resolved_not_counted"
          : outcome === "terminal_failed"
            ? "terminal_failed"
            : outcome === "unknown_outcome"
              ? "unknown_outcome"
              : "available"
      return { data: true, error: null }
    }
    return { data: null, error: null }
  })
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
    rpc,
  }

  return { inserted, rpc, supabase }
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

  it("restates a fully refunded paid conversion to a reversible floor and audits exact cash", async () => {
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
      adjustedValue: 0.01,
      adjustmentDateTime: new Date("2026-07-01T01:30:00.000Z"),
      adjustmentType: "RESTATEMENT",
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
          adjustment_type: "RESTATEMENT",
          amount_cents: 2495,
          exact_target_net_value_cents: 0,
          refund_amount_cents: 2495,
          source: "stripe_charge_refunded",
          status: "success",
          target_net_value_cents: 1,
          zero_value_floor_applied: true,
        }),
      },
    })
  })

  it("atomically reserves before mutation so concurrent workers upload once", async () => {
    let releaseUpload: (() => void) | undefined
    mocks.fireGoogleAdsConversionAdjustment.mockImplementation(async () => {
      await new Promise<void>((resolve) => {
        releaseUpload = resolve
      })
      return { attempted: true, ok: true }
    })
    const { rpc, supabase } = adjustmentSupabaseMock([successfulPurchaseUpload()])
    const input = {
      amountCents: 2495,
      intakeId: "intake_123",
      paymentStatus: "refunded",
      refundAmountCents: 2495,
      source: "cron_backfill" as const,
      supabase: supabase as never,
    }

    const first = runGoogleAdsConversionAdjustment(input)
    await vi.waitFor(() => {
      expect(mocks.fireGoogleAdsConversionAdjustment).toHaveBeenCalledTimes(1)
    })
    const second = await runGoogleAdsConversionAdjustment(input)
    expect(second).toMatchObject({ attempted: false, status: "skipped_in_progress" })
    expect(mocks.fireGoogleAdsConversionAdjustment).toHaveBeenCalledTimes(1)

    releaseUpload?.()
    await expect(first).resolves.toMatchObject({ status: "success" })
    expect(rpc).toHaveBeenCalledWith(
      "reserve_google_ads_conversion_adjustment",
      expect.objectContaining({
        p_adjustment_type: "RESTATEMENT",
        p_target_net_value_cents: 1,
      }),
    )
  })

  it("keeps an explicit transport ambiguity durably blocked as unknown outcome", async () => {
    mocks.fireGoogleAdsConversionAdjustment.mockResolvedValue({
      attempted: true,
      error: "connection reset after request write",
      ok: false,
      unknownOutcome: true,
    })
    const { rpc, supabase } = adjustmentSupabaseMock([successfulPurchaseUpload()])
    const input = {
      amountCents: 2495,
      intakeId: "intake_123",
      paymentStatus: "refunded",
      refundAmountCents: 2495,
      source: "cron_backfill" as const,
      supabase: supabase as never,
    }

    await expect(runGoogleAdsConversionAdjustment(input)).resolves.toMatchObject({
      attempted: true,
      status: "unknown_outcome",
    })
    expect(rpc).toHaveBeenCalledWith(
      "complete_google_ads_conversion_adjustment_claim",
      expect.objectContaining({ p_outcome: "unknown_outcome" }),
    )

    await expect(runGoogleAdsConversionAdjustment(input)).resolves.toMatchObject({
      attempted: false,
      error: "adjustment_outcome_unknown",
      status: "unknown_outcome",
    })
    expect(mocks.fireGoogleAdsConversionAdjustment).toHaveBeenCalledTimes(1)
  })

  it("creates a new desired-state generation when value returns to a prior target", async () => {
    mocks.fireGoogleAdsConversionAdjustment.mockResolvedValue({ attempted: true, ok: true })
    const { supabase } = adjustmentSupabaseMock([successfulPurchaseUpload()])
    const base = {
      amountCents: 4995,
      intakeId: "intake_123",
      paymentStatus: "partially_refunded",
      refundAmountCents: 0,
      source: "cron_backfill" as const,
      supabase: supabase as never,
    }

    await runGoogleAdsConversionAdjustment({ ...base, targetNetValueCents: 4000 })
    await runGoogleAdsConversionAdjustment({ ...base, targetNetValueCents: 4995 })
    await runGoogleAdsConversionAdjustment({ ...base, targetNetValueCents: 4000 })

    expect(mocks.fireGoogleAdsConversionAdjustment).toHaveBeenCalledTimes(3)
    expect(mocks.fireGoogleAdsConversionAdjustment.mock.calls.map(
      ([input]) => input.adjustedValue,
    )).toEqual([40, 49.95, 40])
  })

  it("uses a reversible one-cent restatement for an exact zero cash target", async () => {
    mocks.fireGoogleAdsConversionAdjustment.mockResolvedValue({ attempted: true, ok: true })
    const { supabase } = adjustmentSupabaseMock([successfulPurchaseUpload()])

    await runGoogleAdsConversionAdjustment({
      amountCents: 4995,
      intakeId: "intake_123",
      paymentStatus: "refunded",
      refundAmountCents: 4995,
      source: "stripe_refund_lifecycle",
      supabase: supabase as never,
      targetNetValueCents: 0,
    })

    expect(mocks.fireGoogleAdsConversionAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        adjustedValue: 0.01,
        adjustmentType: "RESTATEMENT",
      }),
    )
  })

  it("fails closed before external mutation when the reservation store is unavailable", async () => {
    const { supabase } = adjustmentSupabaseMock(
      [successfulPurchaseUpload()],
      { reservationError: "temporary database outage" },
    )

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
      error: "adjustment_reservation_unavailable",
      status: "failed",
    })
    expect(mocks.fireGoogleAdsConversionAdjustment).not.toHaveBeenCalled()
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

  it("uses the reversible floor for a fully lost disputed conversion", async () => {
    mocks.fireGoogleAdsConversionAdjustment.mockResolvedValue({ attempted: true, ok: true })
    const { supabase } = adjustmentSupabaseMock([successfulPurchaseUpload()])

    await runGoogleAdsConversionAdjustment({
      amountCents: 4995,
      intakeId: "intake_123",
      paymentStatus: "disputed",
      refundAmountCents: 0,
      source: "stripe_charge_dispute_lost",
      supabase: supabase as never,
    })

    expect(mocks.fireGoogleAdsConversionAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        adjustedValue: 0.01,
        adjustmentType: "RESTATEMENT",
        orderId: "intake_123",
      }),
    )
  })

  it("restates a terminal partial dispute to its exact retained value", async () => {
    mocks.fireGoogleAdsConversionAdjustment.mockResolvedValue({ attempted: true, ok: true })
    const { supabase } = adjustmentSupabaseMock([successfulPurchaseUpload()])

    await runGoogleAdsConversionAdjustment({
      amountCents: 4995,
      intakeId: "intake_123",
      paymentStatus: "disputed",
      refundAmountCents: 995,
      source: "stripe_charge_dispute_lost",
      supabase: supabase as never,
      targetNetValueCents: 2000,
    })

    expect(mocks.fireGoogleAdsConversionAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        adjustedValue: 20,
        adjustmentType: "RESTATEMENT",
        orderId: "intake_123",
      }),
    )
  })

  it("keeps a zero-value target retryable until a late purchase upload can be adjusted", async () => {
    const audits: AuditRow[] = []
    const { inserted, rpc, supabase } = adjustmentSupabaseMock(audits)

    const missingUpload = await runGoogleAdsConversionAdjustment({
      amountCents: 2495,
      intakeId: "intake_missing_upload",
      paymentStatus: "refunded",
      refundAmountCents: 2495,
      source: "cron_backfill",
      supabase: supabase as never,
    })

    expect(missingUpload).toMatchObject({
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
    expect(rpc).toHaveBeenCalledWith(
      "complete_google_ads_conversion_adjustment_claim",
      expect.objectContaining({ p_outcome: "retryable_failed" }),
    )

    audits.push(successfulPurchaseUpload("intake_missing_upload"))
    mocks.fireGoogleAdsConversionAdjustment.mockResolvedValue({ attempted: true, ok: true })

    const adjusted = await runGoogleAdsConversionAdjustment({
      amountCents: 2495,
      intakeId: "intake_missing_upload",
      paymentStatus: "refunded",
      refundAmountCents: 2495,
      source: "cron_backfill",
      supabase: supabase as never,
    })

    expect(adjusted).toMatchObject({ attempted: true, ok: true, status: "success" })
    expect(mocks.fireGoogleAdsConversionAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        adjustedValue: 0.01,
        adjustmentType: "RESTATEMENT",
        orderId: "intake_missing_upload",
      }),
    )
  })

  it("records the missing-upload skip once instead of once per cron run", async () => {
    const { inserted, supabase } = adjustmentSupabaseMock([
      {
        action: GOOGLE_ADS_CONVERSION_ADJUSTMENT_AUDIT_ACTION,
        created_at: hoursAgoIso(2),
        intake_id: "intake_missing_upload",
        metadata: {
          adjustment_type: "RESTATEMENT",
          status: "skipped_missing_successful_upload",
          target_net_value_cents: 1,
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

  it("resolves a post-grace conversion-not-found as not counted", async () => {
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
      status: "resolved_not_counted",
    })
    expect(inserted[0]).toMatchObject({
      payload: {
        metadata: expect.objectContaining({
          error_code: CONVERSION_NOT_FOUND_ERROR,
          resolution_reason: "conversion_not_found",
          status: "resolved_not_counted",
          terminal: false,
          terminal_reason: null,
        }),
      },
    })
    expect(mocks.sentryCaptureMessage).not.toHaveBeenCalled()
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
          adjustment_type: "RESTATEMENT",
          error_code: CONVERSION_NOT_FOUND_ERROR,
          status: "failed",
          target_net_value_cents: 1,
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

  it("retries a conversion-not-found recorded before grace after the upload passes grace", async () => {
    mocks.fireGoogleAdsConversionAdjustment.mockResolvedValue({ attempted: true, ok: true })
    const { inserted, supabase } = adjustmentSupabaseMock([
      successfulPurchaseUpload("intake_123", { ageHours: PAST_GRACE_HOURS }),
      {
        action: GOOGLE_ADS_CONVERSION_ADJUSTMENT_AUDIT_ACTION,
        created_at: hoursAgoIso(PAST_GRACE_HOURS - 1),
        intake_id: "intake_123",
        metadata: {
          adjustment_type: "RESTATEMENT",
          error_code: CONVERSION_NOT_FOUND_ERROR,
          status: "failed",
          target_net_value_cents: 1,
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
    expect(inserted).toHaveLength(1)
  })

  it("reconciles a prior post-grace conversion-not-found without another API attempt", async () => {
    const uploadAgeHours = PAST_GRACE_HOURS + 24
    const { inserted, supabase } = adjustmentSupabaseMock([
      successfulPurchaseUpload("intake_123", { ageHours: uploadAgeHours }),
      {
        action: GOOGLE_ADS_CONVERSION_ADJUSTMENT_AUDIT_ACTION,
        created_at: hoursAgoIso(uploadAgeHours - GOOGLE_ADS_ADJUSTMENT_CONVERSION_MATCH_GRACE_HOURS - 1),
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
      status: "resolved_not_counted",
    })
    expect(mocks.fireGoogleAdsConversionAdjustment).not.toHaveBeenCalled()
    expect(inserted).toHaveLength(1)
    expect(inserted[0]).toMatchObject({
      payload: {
        metadata: expect.objectContaining({
          resolution_reason: "conversion_not_found",
          status: "resolved_not_counted",
        }),
      },
    })
  })

  it("blocks non-conversion-not-found terminal rows regardless of upload age", async () => {
    const { supabase } = adjustmentSupabaseMock([
      successfulPurchaseUpload("intake_123", { ageHours: WITHIN_GRACE_HOURS }),
      {
        action: GOOGLE_ADS_CONVERSION_ADJUSTMENT_AUDIT_ACTION,
        created_at: hoursAgoIso(0.5),
        intake_id: "intake_123",
        metadata: {
          adjustment_type: "RESTATEMENT",
          error_code: "dm_request_rejected",
          status: "terminal_failed",
          target_net_value_cents: 1,
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
      status: "resolved_not_counted",
    })
    expect(mocks.retrieveGoogleDataManagerRequestStatus).toHaveBeenCalledWith("request-123")
    expect(mocks.fireGoogleAdsConversionAdjustment).not.toHaveBeenCalled()
    expect(inserted[0]).toMatchObject({
      payload: {
        metadata: expect.objectContaining({
          error_code: "dm_request_rejected",
          resolution_reason: "dm_request_rejected",
          status: "resolved_not_counted",
          terminal: false,
          terminal_reason: null,
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

  it("skips both external mutation and audit writes from local development runtimes", async () => {
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

    expect(result).toMatchObject({ attempted: false, status: "skipped_local_dev" })
    expect(mocks.fireGoogleAdsConversionAdjustment).not.toHaveBeenCalled()
    expect(inserted).toHaveLength(0)
  })
})
