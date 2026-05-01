import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  applyRateLimit: vi.fn(),
  createServiceRoleClient: vi.fn(),
  getApiAuth: vi.fn(),
  revalidatePath: vi.fn(),
  requireValidCsrf: vi.fn(),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("@/lib/auth/helpers", () => ({
  getApiAuth: mocks.getApiAuth,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
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

import { POST } from "@/app/api/patient/messages/route"

const INTAKE_ID = "11111111-1111-4111-8111-111111111111"
const PATIENT_ID = "22222222-2222-4222-8222-222222222222"
const OTHER_PATIENT_ID = "33333333-3333-4333-8333-333333333333"

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/patient/messages", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  })
}

function createSupabaseMock(intake: Record<string, unknown>) {
  const insert = vi.fn()
  const intakeSelect = {
    eq: vi.fn(() => intakeSelect),
    single: vi.fn(async () => ({ data: intake, error: null })),
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "intakes") {
        return {
          select: vi.fn(() => intakeSelect),
        }
      }

      if (table === "patient_messages") {
        return { insert }
      }

      throw new Error(`Unexpected table ${table}`)
    }),
    rpc: vi.fn(async () => ({
      data: {
        created_at: "2026-05-01T00:00:00.000Z",
        message_id: "44444444-4444-4444-8444-444444444444",
        restored_status: "in_review",
      },
      error: null,
    })),
  }

  mocks.createServiceRoleClient.mockReturnValue(supabase)
  return { insert, supabase }
}

describe("POST /api/patient/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.applyRateLimit.mockResolvedValue(null)
    mocks.getApiAuth.mockResolvedValue({ profile: { id: PATIENT_ID } })
    mocks.requireValidCsrf.mockResolvedValue(null)
  })

  it("atomically records a pending-info reply and restores the clinical queue status", async () => {
    const { insert, supabase } = createSupabaseMock({
      id: INTAKE_ID,
      patient_id: PATIENT_ID,
      previous_status: "in_review",
      status: "pending_info",
    })

    const response = await POST(makeRequest({
      content: "  The requested detail is attached in this reply.  ",
      intakeId: INTAKE_ID,
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      message: {
        created_at: "2026-05-01T00:00:00.000Z",
        id: "44444444-4444-4444-8444-444444444444",
        restored_status: "in_review",
      },
      success: true,
    })
    expect(supabase.rpc).toHaveBeenCalledWith("respond_to_info_request_atomic", {
      p_intake_id: INTAKE_ID,
      p_message: "The requested detail is attached in this reply.",
      p_patient_id: PATIENT_ID,
    })
    expect(insert).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/doctor/queue")
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/doctor/intakes/${INTAKE_ID}`)
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/patient/intakes/${INTAKE_ID}`)
  })

  it("does not write a message when the intake belongs to another patient", async () => {
    const { insert, supabase } = createSupabaseMock({
      id: INTAKE_ID,
      patient_id: OTHER_PATIENT_ID,
      previous_status: "paid",
      status: "pending_info",
    })

    const response = await POST(makeRequest({
      content: "Clinical reply",
      intakeId: INTAKE_ID,
    }))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toEqual({ error: "Intake not found" })
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
  })

  it("rejects whitespace-only messages after trimming", async () => {
    createSupabaseMock({
      id: INTAKE_ID,
      patient_id: PATIENT_ID,
      previous_status: "paid",
      status: "pending_info",
    })

    const response = await POST(makeRequest({
      content: "   ",
      intakeId: INTAKE_ID,
    }))

    expect(response.status).toBe(400)
  })
})
