import { beforeEach, describe, expect, it, vi } from "vitest"

const sentryMessages: Array<{ message: string; payload: unknown }> = []

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn((message: string, payload: unknown) => {
    sentryMessages.push({ message, payload })
  }),
}))

const intakes = [
  {
    id: "intake-failed-email",
    reference_number: "IM-FAILED",
    status: "approved",
    payment_status: "paid",
    category: "medical_certificate",
    subtype: null,
    is_priority: false,
    created_at: "2026-05-01T00:00:00.000Z",
    paid_at: "2026-05-01T00:00:00.000Z",
    reviewed_at: "2026-05-01T00:05:00.000Z",
    approved_at: "2026-05-01T00:10:00.000Z",
    patient: { email: "patient@example.com", full_name: "Patient Example" },
    service: { name: "Medical certificate", type: "medical_certificate" },
  },
]

const emailOutboxRows = [
  {
    intake_id: "intake-failed-email",
    email_type: "certificate_delivery",
    status: "failed",
  },
]

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      if (table === "intakes") {
        return {
          select: () => ({
            in: () => ({
              eq: () => Promise.resolve({ data: intakes, error: null }),
            }),
          }),
        }
      }

      if (table === "email_outbox") {
        return {
          select: () => ({
            in: () => ({
              in: () => Promise.resolve({ data: emailOutboxRows, error: null }),
            }),
          }),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    },
  }),
}))

describe("getStuckIntakesDirect", () => {
  beforeEach(() => {
    sentryMessages.length = 0
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-01T00:30:00.000Z"))
  })

  it("classifies approved intakes with failed delivery email as delivery_failed", async () => {
    const { getStuckIntakesDirect } = await import("@/lib/data/intake-ops")

    const result = await getStuckIntakesDirect({}, { captureWarnings: false })

    expect(result.error).toBeUndefined()
    expect(result.counts.delivery_failed).toBe(1)
    expect(result.counts.delivery_pending).toBe(0)
    expect(result.data).toMatchObject([
      {
        id: "intake-failed-email",
        stuck_reason: "delivery_failed",
      },
    ])
  })
})
