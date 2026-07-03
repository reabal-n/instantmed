import * as Sentry from "@sentry/nextjs"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/notifications/telegram", () => ({
  notifyNewIntakeViaTelegram: vi.fn(),
}))

vi.mock("@/lib/data/intake-answers", () => ({
  getIntakeAnswers: vi.fn(async () => null),
}))

const { mockGetFeatureFlags } = vi.hoisted(() => ({
  mockGetFeatureFlags: vi.fn(async () => ({
    telegram_notifications_enabled: true,
    ai_auto_approve_enabled: false,
  })),
}))
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlags: () => mockGetFeatureFlags(),
}))

import { getIntakeAnswers } from "@/lib/data/intake-answers"
import { notifyNewIntakeViaTelegram } from "@/lib/notifications/telegram"

const INTAKE_ID = "11111111-1111-4111-8111-111111111111"
const PATIENT_ID = "22222222-2222-4222-8222-222222222222"

function createSupabaseStub(
  claimRows: Array<Record<string, unknown>>,
  options: {
    profileName?: string
    isPriority?: boolean
    guestEmail?: string | null
    referenceNumber?: string | null
    paymentId?: string | null
  } = {},
) {
  const profileName = options.profileName ?? "Alex Patient"
  const isPriority = options.isPriority ?? false
  const guestEmail = options.guestEmail ?? null
  const referenceNumber = options.referenceNumber ?? "IM-WORK-20260703-01234567"
  const paymentId = options.paymentId ?? "cs_live_stub"
  const updates: Array<Record<string, unknown>> = []
  const profileMaybeSingle = vi.fn(async () => ({
    data: { full_name: profileName },
    error: null,
  }))
  const intakeExtrasMaybeSingle = vi.fn(async () => ({
    data: {
      is_priority: isPriority,
      guest_email: guestEmail,
      reference_number: referenceNumber,
      payment_id: paymentId,
    },
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
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: intakeExtrasMaybeSingle,
            })),
          })),
          update: vi.fn((payload: Record<string, unknown>) => {
            updates.push(payload)
            return { eq: intakesEq }
          }),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  return { supabase, updates, profileMaybeSingle, intakeExtrasMaybeSingle }
}

describe("paid request Telegram notification ledger", () => {
  afterEach(() => {
    vi.clearAllMocks()
    mockGetFeatureFlags.mockResolvedValue({
      telegram_notifications_enabled: true,
      ai_auto_approve_enabled: false,
    })
    vi.mocked(getIntakeAnswers).mockResolvedValue(null)
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

    vi.mocked(notifyNewIntakeViaTelegram).mockResolvedValueOnce({ messageId: 42 })
    vi.mocked(getIntakeAnswers).mockResolvedValueOnce(null)

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
      serviceSlug: "med-cert-sick",
      subtype: undefined,
      serviceDetail: undefined,
      isPriority: false,
      autoApprovalCandidate: false,
    })
    expect(profileMaybeSingle).not.toHaveBeenCalled()
    expect(updates[0]).toMatchObject({
      paid_request_telegram_claimed_at: null,
      paid_request_telegram_error: null,
      paid_request_telegram_failed_at: null,
      paid_request_telegram_message_id: 42,
    })
    expect(updates[0].paid_request_telegram_sent_at).toEqual(expect.any(String))
  })

  it("passes the resolved detail (medication / duration) through as serviceDetail and sets the Priority flag when is_priority is true", async () => {
    const { sendPaidRequestTelegramNotification } = await import("@/lib/notifications/paid-request-telegram")
    const { supabase } = createSupabaseStub(
      [
        {
          id: INTAKE_ID,
          patient_id: PATIENT_ID,
          amount_cents: 2995,
          category: "common_scripts",
          subtype: null,
          service_slug: "common-scripts",
          paid_request_telegram_attempts: 1,
        },
      ],
      { isPriority: true },
    )

    vi.mocked(notifyNewIntakeViaTelegram).mockResolvedValueOnce({ messageId: 42 })
    vi.mocked(getIntakeAnswers).mockResolvedValueOnce({ medicationName: "Atorvastatin" })

    const result = await sendPaidRequestTelegramNotification({
      supabase: supabase as never,
      intakeId: INTAKE_ID,
      paymentStatus: "paid",
      amountCents: 2995,
      serviceSlug: "common-scripts",
      category: "common_scripts",
      subtype: null,
    })

    expect(result).toEqual({ sent: true })
    expect(notifyNewIntakeViaTelegram).toHaveBeenCalledWith({
      intakeId: INTAKE_ID,
      serviceSlug: "common-scripts",
      subtype: undefined,
      serviceDetail: "Atorvastatin",
      isPriority: true,
      autoApprovalCandidate: false,
    })
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

  it("respects the new-request Telegram feature flag before claiming a row", async () => {
    mockGetFeatureFlags.mockResolvedValueOnce({
      telegram_notifications_enabled: false,
      ai_auto_approve_enabled: false,
    })
    const { sendPaidRequestTelegramNotification } = await import("@/lib/notifications/paid-request-telegram")
    const { supabase } = createSupabaseStub([
      {
        id: INTAKE_ID,
        patient_id: PATIENT_ID,
        amount_cents: 2995,
        category: "med_certs",
        subtype: null,
        paid_request_telegram_attempts: 1,
      },
    ])

    const result = await sendPaidRequestTelegramNotification({
      supabase: supabase as never,
      intakeId: INTAKE_ID,
      paymentStatus: "paid",
      amountCents: 2995,
      category: "med_certs",
      subtype: null,
    })

    expect(result).toEqual({ sent: false, skipped: "disabled" })
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(notifyNewIntakeViaTelegram).not.toHaveBeenCalled()
  })

  it("never pages the operator for seeded E2E intakes (no claim, no Telegram send)", async () => {
    const { SEEDED_E2E_PATIENT_PROFILE_ID } = await import("@/lib/data/seeded-e2e-data")
    const { sendPaidRequestTelegramNotification } = await import("@/lib/notifications/paid-request-telegram")
    const { supabase } = createSupabaseStub([])

    const result = await sendPaidRequestTelegramNotification({
      supabase: supabase as never,
      intakeId: INTAKE_ID,
      patientId: SEEDED_E2E_PATIENT_PROFILE_ID,
      paymentStatus: "paid",
      amountCents: 2995,
      serviceSlug: "med-cert-sick",
      category: "med_certs",
      subtype: null,
    })

    expect(result).toEqual({ sent: false, skipped: "e2e" })
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(notifyNewIntakeViaTelegram).not.toHaveBeenCalled()
  })

  it("still catches E2E if the caller forgot to pass patientId but the claim row has the seeded patient", async () => {
    const { SEEDED_E2E_PATIENT_PROFILE_ID } = await import("@/lib/data/seeded-e2e-data")
    const { sendPaidRequestTelegramNotification } = await import("@/lib/notifications/paid-request-telegram")
    const { supabase } = createSupabaseStub([
      {
        id: INTAKE_ID,
        patient_id: SEEDED_E2E_PATIENT_PROFILE_ID,
        amount_cents: 2995,
        category: "med_certs",
        subtype: null,
        paid_request_telegram_attempts: 1,
      },
    ])

    const result = await sendPaidRequestTelegramNotification({
      supabase: supabase as never,
      intakeId: INTAKE_ID,
      // No patientId — simulating a caller that didn't pass it.
      paymentStatus: "paid",
      amountCents: 2995,
      serviceSlug: "med-cert-sick",
      category: "med_certs",
      subtype: null,
    })

    expect(result).toEqual({ sent: false, skipped: "e2e" })
    expect(notifyNewIntakeViaTelegram).not.toHaveBeenCalled()
  })

  it("sets autoApprovalCandidate=true for med cert when ai_auto_approve_enabled is on", async () => {
    mockGetFeatureFlags.mockResolvedValueOnce({
      telegram_notifications_enabled: true,
      ai_auto_approve_enabled: true,
    })
    const { sendPaidRequestTelegramNotification } = await import("@/lib/notifications/paid-request-telegram")
    const { supabase } = createSupabaseStub([
      {
        id: INTAKE_ID,
        patient_id: PATIENT_ID,
        amount_cents: 1995,
        category: "med_certs",
        subtype: null,
        paid_request_telegram_attempts: 1,
      },
    ])

    vi.mocked(notifyNewIntakeViaTelegram).mockResolvedValueOnce({ messageId: 42 })

    await sendPaidRequestTelegramNotification({
      supabase: supabase as never,
      intakeId: INTAKE_ID,
      paymentStatus: "paid",
      amountCents: 1995,
      serviceSlug: "med-cert-sick",
      category: "med_certs",
      subtype: null,
    })

    expect(notifyNewIntakeViaTelegram).toHaveBeenCalledWith(
      expect.objectContaining({ autoApprovalCandidate: true }),
    )
  })

  it("keeps autoApprovalCandidate=false for non-med-cert services even when the flag is on", async () => {
    mockGetFeatureFlags.mockResolvedValueOnce({
      telegram_notifications_enabled: true,
      ai_auto_approve_enabled: true,
    })
    const { sendPaidRequestTelegramNotification } = await import("@/lib/notifications/paid-request-telegram")
    const { supabase } = createSupabaseStub([
      {
        id: INTAKE_ID,
        patient_id: PATIENT_ID,
        amount_cents: 4995,
        category: "consult",
        subtype: "ed",
        paid_request_telegram_attempts: 1,
      },
    ])

    vi.mocked(notifyNewIntakeViaTelegram).mockResolvedValueOnce({ messageId: 42 })

    await sendPaidRequestTelegramNotification({
      supabase: supabase as never,
      intakeId: INTAKE_ID,
      paymentStatus: "paid",
      amountCents: 4995,
      serviceSlug: "consult",
      category: "consult",
      subtype: "ed",
    })

    expect(notifyNewIntakeViaTelegram).toHaveBeenCalledWith(
      expect.objectContaining({ autoApprovalCandidate: false }),
    )
  })

  // 2026-07-02 operator complaint: E2E/CI test checkouts (fresh guest profiles
  // with machine-shaped emails) paged the operator's phone as real "New med
  // cert" orders — in real time from local Playwright servers holding a real
  // .env.local, and via the PROD telegram-notifications cron retrying rows a
  // token-less CI server had marked failed.
  it("suppresses machine-generated guest test orders and marks them sent so the cron stops retrying", async () => {
    const { sendPaidRequestTelegramNotification } = await import("@/lib/notifications/paid-request-telegram")
    const { supabase, updates } = createSupabaseStub(
      [
        {
          id: INTAKE_ID,
          patient_id: PATIENT_ID,
          amount_cents: 2995,
          category: "med_certs",
          subtype: null,
          paid_request_telegram_attempts: 1,
        },
      ],
      { guestEmail: "mobile.checkout@example.com" },
    )

    const result = await sendPaidRequestTelegramNotification({
      supabase: supabase as never,
      intakeId: INTAKE_ID,
      paymentStatus: "paid",
      amountCents: 2995,
      serviceSlug: "med-cert-sick",
      category: "med_certs",
      subtype: null,
    })

    expect(result).toEqual({ sent: false, skipped: "e2e" })
    expect(notifyNewIntakeViaTelegram).not.toHaveBeenCalled()
    // Marked SENT (null message id): without this the prod cron re-claims the
    // row after every stale-claim window, forever.
    expect(updates[0]).toMatchObject({ paid_request_telegram_message_id: null })
    expect(updates[0].paid_request_telegram_sent_at).toEqual(expect.any(String))
  })

  it("still pages for a real guest order with a normal email", async () => {
    const { sendPaidRequestTelegramNotification } = await import("@/lib/notifications/paid-request-telegram")
    const { supabase } = createSupabaseStub(
      [
        {
          id: INTAKE_ID,
          patient_id: PATIENT_ID,
          amount_cents: 2995,
          category: "med_certs",
          subtype: null,
          paid_request_telegram_attempts: 1,
        },
      ],
      { guestEmail: "sarah.jones@gmail.com" },
    )
    vi.mocked(notifyNewIntakeViaTelegram).mockResolvedValueOnce({ messageId: 42 })

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
    expect(notifyNewIntakeViaTelegram).toHaveBeenCalled()
  })

  it("skips before claiming when the server itself runs in E2E mode AND burns the row so the prod cron cannot re-claim it", async () => {
    vi.stubEnv("PLAYWRIGHT", "1")
    try {
      const { sendPaidRequestTelegramNotification } = await import("@/lib/notifications/paid-request-telegram")
      const { supabase, updates } = createSupabaseStub([])

      const result = await sendPaidRequestTelegramNotification({
        supabase: supabase as never,
        intakeId: INTAKE_ID,
        paymentStatus: "paid",
        amountCents: 2995,
        serviceSlug: "med-cert-sick",
        category: "med_certs",
        subtype: null,
      })

      expect(result).toEqual({ sent: false, skipped: "e2e" })
      expect(supabase.rpc).not.toHaveBeenCalled()
      // The 2026-07-03 pages: an un-burned row left sent_at NULL and the PROD
      // telegram cron (no E2E env, guest_email NULL on authed fixtures)
      // delivered it as a real order. The E2E-mode server is the only process
      // that KNOWS the order is synthetic, so it must mark the row itself.
      expect(updates).toHaveLength(1)
      expect(updates[0]).toMatchObject({
        paid_request_telegram_message_id: null,
      })
      expect(updates[0].paid_request_telegram_sent_at).toBeTruthy()
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it("classifies AUTHED E2E fixtures (guest_email NULL, E2E- reference) as test orders in the cron path and burns them", async () => {
    const { sendPaidRequestTelegramNotification } = await import("@/lib/notifications/paid-request-telegram")
    // No E2E env: this is the PROD telegram-notifications cron retrying a
    // CI-created row. Fresh random patient id, no guest email — only the
    // intake's own fixture markers can classify it.
    const { supabase, updates } = createSupabaseStub(
      [
        {
          id: INTAKE_ID,
          patient_id: PATIENT_ID,
          amount_cents: 1995,
          category: "medical_certificate",
          subtype: null,
          paid_request_telegram_attempts: 0,
        },
      ],
      { guestEmail: null, referenceNumber: "E2E-AUTO-M123ABC", paymentId: "pi_e2e_auto_m123abc" },
    )

    const result = await sendPaidRequestTelegramNotification({
      supabase: supabase as never,
      intakeId: INTAKE_ID,
      paymentStatus: "paid",
      amountCents: 1995,
      serviceSlug: "med-cert-sick",
      category: "medical_certificate",
      subtype: null,
    })

    expect(result).toEqual({ sent: false, skipped: "e2e" })
    expect(notifyNewIntakeViaTelegram).not.toHaveBeenCalled()
    expect(updates).toHaveLength(1)
    expect(updates[0]).toMatchObject({ paid_request_telegram_message_id: null })
    expect(updates[0].paid_request_telegram_sent_at).toBeTruthy()
  })
})
