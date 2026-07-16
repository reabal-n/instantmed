import { describe, expect, it, vi } from "vitest"

import {
  markCheckoutRecoveryNudgeSent,
  readExactCurrentPaymentFailureEmailContext,
  recordExactCurrentPaymentFailure,
} from "@/app/api/stripe/webhook/handlers/payment-failure-recovery"

interface UpdateRecord {
  filters: Array<{
    column?: string
    method: "eq" | "in" | "is" | "or"
    value: unknown
  }>
  payload: Record<string, unknown>
}

function createFailureSupabaseMock(
  updateResults: Array<{
    data: { checkout_error: string; id: string } | null
    error: { message: string } | null
  }>,
) {
  const updates: UpdateRecord[] = []
  const supabase = {
    from: vi.fn(() => ({
      update: vi.fn((payload: Record<string, unknown>) => {
        const record: UpdateRecord = { filters: [], payload }
        updates.push(record)
        const chain = {
          eq: vi.fn((column: string, value: unknown) => {
            record.filters.push({ column, method: "eq", value })
            return chain
          }),
          in: vi.fn((column: string, value: unknown) => {
            record.filters.push({ column, method: "in", value })
            return chain
          }),
          or: vi.fn((value: string) => {
            record.filters.push({ method: "or", value })
            return chain
          }),
          select: vi.fn(() => ({
            maybeSingle: vi.fn(async () => updateResults.shift()),
          })),
        }
        return chain
      }),
    })),
  }
  return { supabase, updates }
}

describe("exact-current payment failure recovery", () => {
  it.each([
    "safety_blocked_high_stakes",
    "safety_missing_required_information",
  ])("records true failure without erasing %s", async (marker) => {
    const { supabase, updates } = createFailureSupabaseMock([
      { data: null, error: null },
      { data: { checkout_error: marker, id: "intake-1" }, error: null },
    ])

    const result = await recordExactCurrentPaymentFailure({
      checkoutSessionId: "cs_current",
      intakeId: "intake-1",
      ordinaryError: "Payment failed",
      source: "payment_intent.payment_failed",
      supabase: supabase as never,
    })

    expect(result).toEqual({ outcome: "locked_failure", marker })
    expect(updates).toHaveLength(2)
    expect(updates[0].payload).toMatchObject({
      checkout_error: "Payment failed",
      payment_status: "failed",
      status: "checkout_failed",
    })
    expect(updates[0].filters).toEqual(expect.arrayContaining([
      { column: "id", method: "eq", value: "intake-1" },
      { column: "payment_id", method: "eq", value: "cs_current" },
      {
        column: "status",
        method: "in",
        value: ["pending_payment", "checkout_failed"],
      },
      {
        column: "payment_status",
        method: "in",
        value: ["pending", "unpaid", "failed"],
      },
      {
        method: "or",
        value:
          "checkout_error.is.null,and(checkout_error.neq.safety_blocked_high_stakes,checkout_error.neq.safety_missing_required_information)",
      },
    ]))
    expect(updates[1].payload).toMatchObject({
      payment_status: "failed",
      status: "checkout_failed",
    })
    expect(updates[1].payload).not.toHaveProperty("checkout_error")
    expect(updates[1].payload).not.toHaveProperty("triage_result")
    expect(updates[1].payload).not.toHaveProperty("triage_reasons")
    expect(updates[1].filters).toContainEqual({
      column: "checkout_error",
      method: "in",
      value: [
        "safety_blocked_high_stakes",
        "safety_missing_required_information",
      ],
    })
  })

  it("reads recipient context only for the exact current ordinary failed Session", async () => {
    const filters: UpdateRecord["filters"] = []
    const context = {
      abandoned_email_sent_at: null,
      category: "medical_certificate",
      checkout_error: "Payment failed",
      guest_email: "guest@example.test",
      id: "intake-1",
      patient: null,
      payment_id: "cs_current",
      payment_status: "failed",
      status: "checkout_failed",
    }
    const chain = {
      eq: vi.fn((column: string, value: unknown) => {
        filters.push({ column, method: "eq", value })
        return chain
      }),
      is: vi.fn((column: string, value: unknown) => {
        filters.push({ column, method: "is", value })
        return chain
      }),
      or: vi.fn((value: string) => {
        filters.push({ method: "or", value })
        return chain
      }),
      maybeSingle: vi.fn(async () => ({ data: context, error: null })),
    }
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => chain),
      })),
    }

    const result = await readExactCurrentPaymentFailureEmailContext({
      checkoutSessionId: "cs_current",
      intakeId: "intake-1",
      supabase: supabase as never,
    })

    expect(result).toEqual({ context, outcome: "eligible" })
    expect(filters).toEqual(expect.arrayContaining([
      { column: "id", method: "eq", value: "intake-1" },
      { column: "payment_id", method: "eq", value: "cs_current" },
      { column: "status", method: "eq", value: "checkout_failed" },
      { column: "payment_status", method: "eq", value: "failed" },
      { column: "abandoned_email_sent_at", method: "is", value: null },
      {
        method: "or",
        value:
          "checkout_error.is.null,and(checkout_error.neq.safety_blocked_high_stakes,checkout_error.neq.safety_missing_required_information)",
      },
    ]))
  })

  it("marks the recovery nudge only for the exact current unlocked failed Session", async () => {
    const filters: UpdateRecord["filters"] = []
    const payloads: Array<Record<string, unknown>> = []
    const chain = {
      eq: vi.fn((column: string, value: unknown) => {
        filters.push({ column, method: "eq", value })
        return chain
      }),
      is: vi.fn((column: string, value: unknown) => {
        filters.push({ column, method: "is", value })
        return chain
      }),
      or: vi.fn((value: string) => {
        filters.push({ method: "or", value })
        return chain
      }),
      select: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({
          data: { id: "intake-1" },
          error: null,
        })),
      })),
    }
    const supabase = {
      from: vi.fn(() => ({
        update: vi.fn((payload: Record<string, unknown>) => {
          payloads.push(payload)
          return chain
        }),
      })),
    }

    const marked = await markCheckoutRecoveryNudgeSent(
      supabase as never,
      "intake-1",
      "cs_current",
      "payment_intent.payment_failed",
    )

    expect(marked).toBe(true)
    expect(payloads[0]).toHaveProperty("abandoned_email_sent_at")
    expect(filters).toEqual(expect.arrayContaining([
      { column: "id", method: "eq", value: "intake-1" },
      { column: "payment_id", method: "eq", value: "cs_current" },
      { column: "status", method: "eq", value: "checkout_failed" },
      { column: "payment_status", method: "eq", value: "failed" },
      { column: "abandoned_email_sent_at", method: "is", value: null },
      {
        method: "or",
        value:
          "checkout_error.is.null,and(checkout_error.neq.safety_blocked_high_stakes,checkout_error.neq.safety_missing_required_information)",
      },
    ]))
  })
})
