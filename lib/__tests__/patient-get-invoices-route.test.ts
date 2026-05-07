import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  getApiAuth: vi.fn(),
}))

vi.mock("@/lib/auth/helpers", () => ({
  getApiAuth: mocks.getApiAuth,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

import { GET } from "@/app/api/patient/get-invoices/route"

const PATIENT_ID = "22222222-2222-4222-8222-222222222222"

function createGetInvoicesSupabaseMock() {
  const invoiceSelect = vi.fn()
  const intakesQuery = {
    eq: vi.fn(async () => ({
      data: [
        {
          id: "intake-1",
          category: "medical_certificate",
          reference_number: "IM-123",
          service: { name: "Medical Certificate", short_name: "Med Cert" },
          subtype: "work",
        },
      ],
      error: null,
    })),
  }
  const paymentsQuery = {
    in: vi.fn(() => paymentsQuery),
    order: vi.fn(() => paymentsQuery),
    limit: vi.fn(async () => ({
      data: [
        {
          id: "pay-1",
          amount: 1995,
          amount_paid: 0,
          created_at: "2026-05-01T00:00:00.000Z",
          currency: "aud",
          intake_id: "intake-1",
          status: "failed",
          stripe_payment_intent_id: "pi_test",
          stripe_session_id: "cs_test",
          updated_at: "2026-05-01T00:00:00.000Z",
        },
      ],
      error: null,
    })),
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "intakes") {
        return { select: vi.fn(() => intakesQuery) }
      }
      if (table === "payments") {
        return { select: vi.fn(() => paymentsQuery) }
      }
      if (table === "invoices") {
        return { select: invoiceSelect }
      }
      throw new Error(`Unexpected table ${table}`)
    }),
  }

  return { invoiceSelect, paymentsQuery, supabase }
}

describe("GET /api/patient/get-invoices", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getApiAuth.mockResolvedValue({
      profile: {
        id: PATIENT_ID,
        role: "patient",
      },
    })
  })

  it("prefers canonical payment rows so failed payments can retry by payment id", async () => {
    const { invoiceSelect, paymentsQuery, supabase } = createGetInvoicesSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const response = await GET(new Request("https://instantmed.example/api/patient/get-invoices"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.invoices).toEqual([
      {
        created_at: "2026-05-01T00:00:00.000Z",
        description: "Med Cert",
        id: "pay-1",
        number: "IM-123",
        payment_method: "AUD",
        status: "failed",
        total: 1995,
      },
    ])
    expect(paymentsQuery.in).toHaveBeenCalledWith("intake_id", ["intake-1"])
    expect(invoiceSelect).not.toHaveBeenCalled()
  })
})
