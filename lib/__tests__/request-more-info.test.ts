import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  createServiceRoleClient: vi.fn(),
  sendEmail: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
}))

vi.mock("@/lib/auth/helpers", () => ({
  requireRole: mocks.requireRole,
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: mocks.sendEmail,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/lib/email/components/templates/needs-more-info", () => ({
  NeedsMoreInfoEmail: vi.fn(() => "email-template"),
  needsMoreInfoSubject: vi.fn((requestType: string) => `Quick question about your ${requestType} request`),
}))

const INTAKE_ID = "11111111-1111-4111-8111-111111111111"
const PATIENT_ID = "22222222-2222-4222-8222-222222222222"
const DOCTOR_ID = "33333333-3333-4333-8333-333333333333"

function createSupabaseMock(overrides: Record<string, unknown> = {}) {
  const rpcCalls: { name: string; params: Record<string, unknown> }[] = []

  const supabase = {
    rpc: vi.fn(async (name: string, params: Record<string, unknown>) => {
      rpcCalls.push({ name, params })
      return { error: null as { message?: string } | null }
    }),
    from: vi.fn((table: string) => {
      if (table === "intakes") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: {
                  id: INTAKE_ID,
                  status: "paid",
                  patient_id: PATIENT_ID,
                  category: "medical_certificate",
                  service: { type: "med_certs" },
                  subtype: null,
                  claimed_by: DOCTOR_ID,
                  reviewing_doctor_id: null,
                  reviewed_by: null,
                  patient: {
                    id: PATIENT_ID,
                    full_name: "Test Patient",
                    email: "patient@example.test",
                  },
                  ...overrides,
                },
                error: null,
              })),
            })),
          })),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    }),
  }

  return { supabase, rpcCalls }
}

describe("requestMoreInfoAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireRole.mockResolvedValue({ profile: { id: DOCTOR_ID, role: "doctor" } })
    mocks.sendEmail.mockResolvedValue({ success: true })
  })

  it("uses an atomic RPC to create the patient message and pending-info status together", async () => {
    const { supabase, rpcCalls } = createSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const { requestMoreInfoAction } = await import("@/app/actions/request-more-info")

    const result = await requestMoreInfoAction(
      INTAKE_ID,
      "other",
      "Please confirm the requested certificate dates.",
    )

    expect(result.success).toBe(true)
    expect(rpcCalls).toEqual([
      {
        name: "request_more_info_atomic",
        params: expect.objectContaining({
          p_doctor_id: DOCTOR_ID,
          p_intake_id: INTAKE_ID,
          p_message: "Please confirm the requested certificate dates.",
          p_template_code: "other",
        }),
      },
    ])
    expect(supabase.from).not.toHaveBeenCalledWith("patient_messages")
    expect(supabase.from).toHaveBeenCalledWith("intakes")
  })

  it("does not send the notification email when the atomic transition fails", async () => {
    const { supabase } = createSupabaseMock()
    supabase.rpc.mockResolvedValueOnce({ error: { message: "status not allowed" } })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const { requestMoreInfoAction } = await import("@/app/actions/request-more-info")

    const result = await requestMoreInfoAction(
      INTAKE_ID,
      "other",
      "Please confirm the requested certificate dates.",
    )

    expect(result).toEqual({ success: false, error: "Failed to update request" })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("returns a specific error when the request changed to a disallowed status inside the atomic transition", async () => {
    const { supabase } = createSupabaseMock()
    supabase.rpc.mockResolvedValueOnce({
      error: { message: "request_more_info_status_not_allowed" },
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const { requestMoreInfoAction } = await import("@/app/actions/request-more-info")

    const result = await requestMoreInfoAction(
      INTAKE_ID,
      "other",
      "Please confirm the requested certificate dates.",
    )

    expect(result).toEqual({
      success: false,
      error: "Cannot request info for this request status",
    })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })
  it.each(["failed", "thrown"])("keeps the durable request successful when notification is %s", async (failure) => {
    const { supabase, rpcCalls } = createSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    if (failure === "thrown") mocks.sendEmail.mockRejectedValueOnce(new Error("Provider unavailable"))
    else mocks.sendEmail.mockResolvedValueOnce({ success: false, error: "Provider unavailable" })
    const { requestMoreInfoAction } = await import("@/app/actions/request-more-info")
    const result = await requestMoreInfoAction(INTAKE_ID, "other", "Please clarify your symptoms.")
    expect(result.success).toBe(true)
    expect(result.notificationWarning).toMatch(/saved.*email.*not sent/i)
    expect(rpcCalls).toHaveLength(1)
    expect(mocks.revalidatePath).toHaveBeenCalled()
  })

  it("rejects a scoped-out clinician before creating a message or email", async () => {
    mocks.requireRole.mockResolvedValue({ profile: { id: DOCTOR_ID, role: "doctor", can_review_med_certs: false } })
    const { supabase, rpcCalls } = createSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const { requestMoreInfoAction } = await import("@/app/actions/request-more-info")
    const result = await requestMoreInfoAction(INTAKE_ID, "other", "Please clarify.")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/not authorised/)
    expect(rpcCalls).toHaveLength(0)
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it.each([
    { claimed_by: "another-doctor" },
    { claimed_by: null },
    { status: "awaiting_script" },
  ])("rejects unsupported ownership/lifecycle %j without mutation", async (overrides) => {
    const { supabase, rpcCalls } = createSupabaseMock(overrides)
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const { requestMoreInfoAction } = await import("@/app/actions/request-more-info")
    expect((await requestMoreInfoAction(INTAKE_ID, "other", "Please clarify.")).success).toBe(false)
    expect(rpcCalls).toHaveLength(0)
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("reports a missing patient email without replaying the durable message", async () => {
    const { supabase, rpcCalls } = createSupabaseMock({ patient: { id: PATIENT_ID, full_name: "Synthetic Patient", email: null } })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const { requestMoreInfoAction } = await import("@/app/actions/request-more-info")
    const result = await requestMoreInfoAction(INTAKE_ID, "other", "Please clarify.")
    expect(result.success).toBe(true)
    expect(result.notificationWarning).toContain("email was not sent")
    expect(rpcCalls).toHaveLength(1)
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

})
