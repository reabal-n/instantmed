import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  GOOGLE_ADS_CONVERSION_ADJUSTMENT_AUDIT_ACTION,
  runGoogleAdsConversionAdjustment,
} from "@/lib/analytics/google-ads-conversion-adjustments"

const mocks = vi.hoisted(() => ({
  fireGoogleAdsConversionAdjustment: vi.fn(),
}))

vi.mock("@/lib/analytics/google-ads-conversion-api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/analytics/google-ads-conversion-api")>()),
  fireGoogleAdsConversionAdjustment: mocks.fireGoogleAdsConversionAdjustment,
}))

type AuditRow = {
  action: string
  created_at?: string
  intake_id: string | null
  metadata: Record<string, unknown> | null
}

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

function successfulPurchaseUpload(intakeId = "intake_123"): AuditRow {
  return {
    action: "google_ads_conversion_upload",
    created_at: "2026-07-01T01:00:00.000Z",
    intake_id: intakeId,
    metadata: {
      status: "success",
      upload_api: "data_manager_api",
      upload_identifier: "request-123",
    },
  }
}

describe("Google Ads conversion adjustments", () => {
  beforeEach(() => {
    mocks.fireGoogleAdsConversionAdjustment.mockReset()
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
