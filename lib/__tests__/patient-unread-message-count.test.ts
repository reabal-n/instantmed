import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

type IntakeRow = { id: string }

interface IntakeResult {
  data: IntakeRow[] | null
  error: { message: string } | null
}

interface CountResult {
  count: number | null
  error: { message: string } | null
}

function createSupabaseMock(intakeResult: IntakeResult, countResult: CountResult) {
  // intakes chain: from('intakes').select('id').eq('patient_id', X) -> result
  const intakesEq = vi.fn(async () => intakeResult)
  const intakesSelect = vi.fn(() => ({ eq: intakesEq }))

  // messages chain: from('patient_messages').select(..., { count, head })
  //   .in('intake_id', ids).in('sender_type', [...]).is('read_at', null) -> result
  const messagesIsReadAtNull = vi.fn(async () => countResult)
  const messagesInSenderType = vi.fn(() => ({ is: messagesIsReadAtNull }))
  const messagesInIntakeIds = vi.fn(() => ({ in: messagesInSenderType }))
  const messagesSelect = vi.fn(() => ({ in: messagesInIntakeIds }))

  const from = vi.fn((table: string) => {
    if (table === "intakes") return { select: intakesSelect }
    if (table === "patient_messages") return { select: messagesSelect }
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    from,
    intakesEq,
    intakesSelect,
    messagesSelect,
    messagesInIntakeIds,
    messagesInSenderType,
    messagesIsReadAtNull,
  }
}

describe("getPatientUnreadMessageCount", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the count when intakes exist and there are unread doctor messages", async () => {
    const supabase = createSupabaseMock(
      { data: [{ id: "intake-1" }, { id: "intake-2" }], error: null },
      { count: 3, error: null },
    )
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getPatientUnreadMessageCount } = await import("@/lib/data/patient-messages")
    const result = await getPatientUnreadMessageCount("patient-1")

    expect(result).toBe(3)
    expect(supabase.from).toHaveBeenCalledWith("intakes")
    expect(supabase.intakesEq).toHaveBeenCalledWith("patient_id", "patient-1")
    expect(supabase.from).toHaveBeenCalledWith("patient_messages")
    expect(supabase.messagesSelect).toHaveBeenCalledWith("id", { count: "exact", head: true })
    expect(supabase.messagesInIntakeIds).toHaveBeenCalledWith("intake_id", ["intake-1", "intake-2"])
    expect(supabase.messagesInSenderType).toHaveBeenCalledWith("sender_type", ["doctor", "system"])
    expect(supabase.messagesIsReadAtNull).toHaveBeenCalledWith("read_at", null)
  })

  it("returns 0 when the patient has no intakes", async () => {
    const supabase = createSupabaseMock({ data: [], error: null }, { count: 99, error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getPatientUnreadMessageCount } = await import("@/lib/data/patient-messages")
    const result = await getPatientUnreadMessageCount("patient-empty")

    expect(result).toBe(0)
    expect(supabase.messagesSelect).not.toHaveBeenCalled()
  })

  it("returns 0 on Supabase error (advisory fallback)", async () => {
    const supabase = createSupabaseMock(
      { data: [{ id: "intake-1" }], error: null },
      { count: null, error: { message: "boom" } },
    )
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getPatientUnreadMessageCount } = await import("@/lib/data/patient-messages")
    const result = await getPatientUnreadMessageCount("patient-err")

    expect(result).toBe(0)
  })

  it("returns 0 on intake fetch error", async () => {
    const supabase = createSupabaseMock(
      { data: null, error: { message: "intake-failure" } },
      { count: 5, error: null },
    )
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getPatientUnreadMessageCount } = await import("@/lib/data/patient-messages")
    const result = await getPatientUnreadMessageCount("patient-err")

    expect(result).toBe(0)
  })

  it("returns 0 when patientId is empty", async () => {
    const { getPatientUnreadMessageCount } = await import("@/lib/data/patient-messages")
    const result = await getPatientUnreadMessageCount("")
    expect(result).toBe(0)
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })
})
