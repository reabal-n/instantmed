import * as Sentry from "@sentry/nextjs"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

import {
  getReconciliationRecords,
} from "@/lib/data/reconciliation"
import { getPaymentTraceabilityIssue } from "@/lib/data/reconciliation-helpers"

function createThenable<T>(result: T) {
  return {
    then: (resolve: (value: T) => void) => Promise.resolve(result).then(resolve),
  }
}

function createQuery<T>(result: T) {
  const query = {
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    in: vi.fn(() => query),
    limit: vi.fn(() => query),
    lte: vi.fn(() => query),
    not: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(() => query),
    then: (resolve: (value: T) => void) => Promise.resolve(result).then(resolve),
  }
  return query
}

function createReconciliationSupabaseMock() {
  const paidAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "intakes") {
        return {
          select: vi.fn(() => createQuery({
            data: [{
              category: "medical_certificate",
              created_at: paidAt,
              generated_document_url: null,
              id: "intake-1",
              patient: { email: "patient@example.test", full_name: "Patient Name" },
              paid_at: paidAt,
              payment_id: null,
              payment_status: "paid",
              reference_number: "REF-123",
              refund_error: null,
              refund_status: null,
              script_sent: false,
              script_sent_at: null,
              service: { name: "Medical certificate", type: "medical_certificate" },
              status: "paid",
              stripe_payment_intent_id: null,
              subtype: "work",
            }],
            error: null,
          })),
        }
      }

      if (table === "email_outbox") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(() => createThenable({ data: [], error: null })),
            })),
          })),
        }
      }

      if (table === "intake_documents") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => createThenable({ data: [], error: null })),
          })),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    }),
  }

  return supabase
}

describe("payment reconciliation hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.DISABLE_RECONCILIATION_SENTRY
  })

  it("flags paid records that are missing Stripe payment intent traceability", () => {
    expect(getPaymentTraceabilityIssue({
      payment_id: "cs_test",
      payment_status: "paid",
      stripe_payment_intent_id: null,
    })).toBe("Paid request missing Stripe payment intent")

    expect(getPaymentTraceabilityIssue({
      payment_id: null,
      payment_status: "paid",
      stripe_payment_intent_id: null,
    })).toBe("Paid request missing Stripe payment intent and checkout session")

    expect(getPaymentTraceabilityIssue({
      payment_id: null,
      payment_status: "pending",
      stripe_payment_intent_id: null,
    })).toBeNull()
  })

  it("keeps reconciliation Sentry alerts free of patient identifiers", async () => {
    mocks.createServiceRoleClient.mockReturnValue(createReconciliationSupabaseMock())

    const result = await getReconciliationRecords({
      date_from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      mismatch_only: false,
    })

    expect(result.summary.mismatches).toBe(1)
    expect(result.data[0]).toMatchObject({
      is_mismatch: true,
      payment_issue: "Paid request missing Stripe payment intent and checkout session",
    })
    expect(Sentry.captureMessage).toHaveBeenCalled()

    const sentryPayload = JSON.stringify(vi.mocked(Sentry.captureMessage).mock.calls)
    expect(sentryPayload).not.toContain("patient@example.test")
    expect(sentryPayload).not.toContain("Patient Name")
    expect(sentryPayload).not.toContain("REF-123")
    expect(sentryPayload).not.toContain("intake-1")
  })
})
