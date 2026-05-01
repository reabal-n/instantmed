import { readFileSync } from "node:fs"
import { join } from "node:path"

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  applyRateLimit: vi.fn(),
  createServiceRoleClient: vi.fn(),
  getApiAuth: vi.fn(),
  requireValidCsrf: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}))

vi.mock("@/lib/auth/helpers", () => ({
  getApiAuth: mocks.getApiAuth,
}))

vi.mock("@/lib/config/env", () => ({
  env: { appUrl: "https://instantmed.example" },
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}))

vi.mock("@/lib/rate-limit/redis", () => ({
  applyRateLimit: mocks.applyRateLimit,
}))

vi.mock("@/lib/security/csrf", () => ({
  requireValidCsrf: mocks.requireValidCsrf,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

import { POST } from "@/app/api/patient/retry-payment/route"

const PATIENT_ID = "22222222-2222-4222-8222-222222222222"
const retryPaymentRouteSource = readFileSync(
  join(process.cwd(), "app/api/patient/retry-payment/route.ts"),
  "utf8",
)
const intakeDetailClientSource = readFileSync(
  join(process.cwd(), "app/patient/intakes/[id]/client.tsx"),
  "utf8",
)

function postRetryPayment(invoiceId = "pay-1") {
  return POST(new Request("https://instantmed.example/api/patient/retry-payment", {
    body: JSON.stringify({ invoiceId }),
    headers: { "content-type": "application/json" },
    method: "POST",
  }) as never)
}

function createPaymentFallbackSupabaseMock({ ownsIntake = true }: { ownsIntake?: boolean } = {}) {
  const invoiceQuery = {
    eq: vi.fn(() => invoiceQuery),
    single: vi.fn(async () => ({ data: null, error: { code: "PGRST205" } })),
  }
  const paymentQuery = {
    eq: vi.fn(() => paymentQuery),
    maybeSingle: vi.fn(async () => ({ data: { id: "pay-1", intake_id: "intake-1" }, error: null })),
  }
  const intakeQuery = {
    eq: vi.fn(() => intakeQuery),
    maybeSingle: vi.fn(async () => ({
      data: ownsIntake ? { id: "intake-1" } : null,
      error: null,
    })),
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "invoices") {
        return { select: vi.fn(() => invoiceQuery) }
      }
      if (table === "payments") {
        return { select: vi.fn(() => paymentQuery) }
      }
      if (table === "intakes") {
        return { select: vi.fn(() => intakeQuery) }
      }
      throw new Error(`Unexpected table ${table}`)
    }),
  }

  return { intakeQuery, paymentQuery, supabase }
}

describe("POST /api/patient/retry-payment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.applyRateLimit.mockResolvedValue(null)
    mocks.requireValidCsrf.mockResolvedValue(null)
    mocks.getApiAuth.mockResolvedValue({
      profile: {
        email: "patient@example.test",
        full_name: "Test Patient",
        id: PATIENT_ID,
        role: "patient",
      },
    })
  })

  it("retries a canonical payment-history payment through the owned intake checkout flow", async () => {
    const { intakeQuery, paymentQuery, supabase } = createPaymentFallbackSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const response = await postRetryPayment()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      paymentUrl: "https://instantmed.example/patient/intakes/intake-1?retry=true",
      success: true,
    })
    expect(paymentQuery.eq).toHaveBeenCalledWith("id", "pay-1")
    expect(intakeQuery.eq).toHaveBeenCalledWith("patient_id", PATIENT_ID)
  })

  it("does not retry a payment whose intake is not owned by the patient", async () => {
    const { supabase } = createPaymentFallbackSupabaseMock({ ownsIntake: false })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const response = await postRetryPayment()

    expect(response.status).toBe(404)
  })

  it("keeps the intake detail retry query wired to the canonical checkout retry action", () => {
    expect(retryPaymentRouteSource).not.toContain("/checkout?invoiceId=")
    expect(retryPaymentRouteSource).toContain("/patient/intakes/${intakeId}?retry=true")
    expect(intakeDetailClientSource).toContain("retryPayment = false")
    expect(intakeDetailClientSource).toContain("hasAutoRetriedPayment")
    expect(intakeDetailClientSource).toContain("retryPaymentForIntakeAction(intake.id)")
  })
})
