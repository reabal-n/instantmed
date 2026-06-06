import { describe, expect, it, vi } from "vitest"

import { markPartialIntakeConverted } from "@/lib/request/server-draft-conversion"

const SESSION_ID = "11111111-1111-4111-8111-111111111111"
const INTAKE_ID = "22222222-2222-4222-8222-222222222222"

function makeSupabaseMock() {
  const maybeSingle = vi.fn(async () => ({
    data: { session_id: SESSION_ID },
    error: null,
  }))
  const select = vi.fn(() => ({ maybeSingle }))
  const is = vi.fn(() => ({ select }))
  const eq = vi.fn(() => ({ is }))
  const update = vi.fn(() => ({ eq }))
  const from = vi.fn((table: string) => {
    if (table !== "partial_intakes") {
      throw new Error(`Unexpected table ${table}`)
    }
    return { update }
  })

  return {
    supabase: { from },
    calls: { eq, from, is, maybeSingle, select, update },
  }
}

describe("server draft conversion marker", () => {
  it("marks only an unconverted partial intake with the new intake id", async () => {
    const { calls, supabase } = makeSupabaseMock()

    const result = await markPartialIntakeConverted(supabase as never, {
      intakeId: INTAKE_ID,
      sessionId: SESSION_ID,
    })

    expect(result).toEqual({ marked: true, reason: "marked" })
    expect(calls.update).toHaveBeenCalledWith({ converted_to_intake_id: INTAKE_ID })
    expect(calls.eq).toHaveBeenCalledWith("session_id", SESSION_ID)
    expect(calls.is).toHaveBeenCalledWith("converted_to_intake_id", null)
  })

  it("does not touch storage when either id is invalid", async () => {
    const { calls, supabase } = makeSupabaseMock()

    const result = await markPartialIntakeConverted(supabase as never, {
      intakeId: "not-a-uuid",
      sessionId: SESSION_ID,
    })

    expect(result).toEqual({ marked: false, reason: "invalid_id" })
    expect(calls.from).not.toHaveBeenCalled()
  })
})
