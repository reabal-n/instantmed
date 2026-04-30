import * as Sentry from "@sentry/nextjs"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/notifications/telegram", () => ({
  notifyNewIntakeViaTelegram: vi.fn(),
}))

import { notifyNewIntakeViaTelegram } from "@/lib/notifications/telegram"

const INTAKE_ID = "11111111-1111-4111-8111-111111111111"
const PATIENT_ID = "22222222-2222-4222-8222-222222222222"

function createSupabaseStub(claimRows: Array<Record<string, unknown>>, profileName = "Alex Patient") {
  const updates: Array<Record<string, unknown>> = []
  const profileMaybeSingle = vi.fn(async () => ({
    data: { full_name: profileName },
    error: null,
  }))
  const intakesEq = vi.fn(async () => ({ data: null, error: null }))

  const supabase = {
    rpc: vi.fn(async () => ({ data: claimRows, error: null })),
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: profileMaybeSingle,
            })),
          })),
        }
      }

      if (table === "intakes") {
        return {
          update: vi.fn((payload: Record<string, unknown>) => {
            updates.push(payload)
            return { eq: intakesEq }
          }),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  return { supabase, updates, profileMaybeSingle }
}

describe("paid request Telegram notification ledger", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("claims a paid intake before sending and marks Telegram delivery as sent without fetching patient PHI", async () => {
    const { sendPaidRequestTelegramNotification } = await import("@/lib/notifications/paid-request-telegram")
    const { supabase, updates, profileMaybeSingle } = createSupabaseStub([
      {
        id: INTAKE_ID,
        patient_id: PATIENT_ID,
        amount_cents: 2995,
        category: "med_certs",
        subtype: null,
        service_slug: "med-cert-sick",
        paid_request_telegram_attempts: 1,
      },
    ])

    vi.mocked(notifyNewIntakeViaTelegram).mockResolvedValueOnce()

    const result = await sendPaidRequestTelegramNotification({
      supabase: supabase as never,
      intakeId: INTAKE_ID,
      paymentStatus: "paid",
      amountCents: 2995,
      serviceSlug: "med-cert-sick",
      category: "med_certs",
      subtype: null,
    })

    expect(result).toEqual({ sent: true })
    expect(supabase.rpc).toHaveBeenCalledWith(
      "claim_paid_request_telegram_notification",
      expect.objectContaining({ p_intake_id: INTAKE_ID }),
    )
    expect(notifyNewIntakeViaTelegram).toHaveBeenCalledWith({
      intakeId: INTAKE_ID,
      patientName: "Patient",
      serviceName: "Medical Certificate",
      amount: "$29.95",
      serviceSlug: "med-cert-sick",
    })
    expect(profileMaybeSingle).not.toHaveBeenCalled()
    expect(updates[0]).toMatchObject({
      paid_request_telegram_claimed_at: null,
      paid_request_telegram_error: null,
      paid_request_telegram_failed_at: null,
    })
    expect(updates[0].paid_request_telegram_sent_at).toEqual(expect.any(String))
  })

  it("records failed Telegram attempts so cron can retry missed notifications", async () => {
    const { sendPaidRequestTelegramNotification } = await import("@/lib/notifications/paid-request-telegram")
    const { supabase, updates } = createSupabaseStub([
      {
        id: INTAKE_ID,
        patient_id: PATIENT_ID,
        amount_cents: 2995,
        category: "consult",
        subtype: "general",
        service_slug: "consult",
        paid_request_telegram_attempts: 1,
      },
    ])

    vi.mocked(notifyNewIntakeViaTelegram).mockRejectedValueOnce(new Error("Telegram down"))

    await expect(sendPaidRequestTelegramNotification({
      supabase: supabase as never,
      intakeId: INTAKE_ID,
      paymentStatus: "paid",
      amountCents: 2995,
      serviceSlug: "consult",
      category: "consult",
      subtype: "general",
    })).rejects.toThrow("Telegram down")

    expect(updates[0]).toMatchObject({
      paid_request_telegram_claimed_at: null,
      paid_request_telegram_error: "Telegram down",
    })
    expect(updates[0].paid_request_telegram_failed_at).toEqual(expect.any(String))
    expect(updates[0]).not.toHaveProperty("paid_request_telegram_sent_at")
  })

  it("captures a PHI-safe Sentry signal when Telegram delivery reaches the retry cap", async () => {
    const { sendPaidRequestTelegramNotification } = await import("@/lib/notifications/paid-request-telegram")
    const { supabase } = createSupabaseStub([
      {
        id: INTAKE_ID,
        patient_id: PATIENT_ID,
        amount_cents: 2995,
        category: "consult",
        subtype: "general",
        paid_request_telegram_attempts: 6,
      },
    ])

    vi.mocked(notifyNewIntakeViaTelegram).mockRejectedValueOnce(new Error("Telegram down"))

    await expect(sendPaidRequestTelegramNotification({
      supabase: supabase as never,
      intakeId: INTAKE_ID,
      paymentStatus: "paid",
      amountCents: 2995,
      category: "consult",
      subtype: "general",
    })).rejects.toThrow("Telegram down")

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "Paid request Telegram notification retry cap reached",
      expect.objectContaining({
        level: "error",
        tags: { source: "paid-request-telegram" },
        extra: { intakeId: INTAKE_ID, attempts: 6 },
      }),
    )
  })

  it("skips sending when another worker already claimed or sent the intake", async () => {
    const { sendPaidRequestTelegramNotification } = await import("@/lib/notifications/paid-request-telegram")
    const { supabase } = createSupabaseStub([])

    const result = await sendPaidRequestTelegramNotification({
      supabase: supabase as never,
      intakeId: INTAKE_ID,
      paymentStatus: "paid",
      amountCents: 2995,
      serviceSlug: "med-cert-sick",
      category: "med_certs",
      subtype: null,
    })

    expect(result).toEqual({ sent: false, skipped: "already_sent_or_claimed" })
    expect(notifyNewIntakeViaTelegram).not.toHaveBeenCalled()
  })
})
