import { describe, expect, it, vi } from "vitest"

import {
  findConvertedPartialIntakeForCheckout,
  markPartialIntakeConverted,
} from "@/lib/request/server-draft-conversion"

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

describe("converted server draft checkout reuse", () => {
  it("loads the one intake already created from the same draft", async () => {
    const partialMaybeSingle = vi.fn(async () => ({
      data: {
        converted_to_intake_id: INTAKE_ID,
        email: "Patient@Example.com",
      },
      error: null,
    }))
    const intakeMaybeSingle = vi.fn(async () => ({
      data: {
        category: "prescription",
        guest_email: "patient@example.com",
        id: INTAKE_ID,
        patient_id: "patient-1",
        payment_id: "cs_test_1",
        payment_status: "pending",
        status: "pending_payment",
        subtype: "repeat",
      },
      error: null,
    }))
    const from = vi.fn((table: string) => {
      if (table === "partial_intakes") {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          gt: vi.fn(() => chain),
          not: vi.fn(() => chain),
          maybeSingle: partialMaybeSingle,
        }
        return chain
      }
      if (table === "intakes") {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          maybeSingle: intakeMaybeSingle,
        }
        return chain
      }
      throw new Error(`Unexpected table ${table}`)
    })

    const result = await findConvertedPartialIntakeForCheckout(
      { from } as never,
      {
        category: "prescription",
        email: " patient@example.com ",
        sessionId: SESSION_ID,
        subtype: "repeat",
      },
    )

    expect(result).toEqual({
      kind: "reusable",
      intake: {
        category: "prescription",
        guestEmail: "patient@example.com",
        id: INTAKE_ID,
        patientId: "patient-1",
        paymentId: "cs_test_1",
        paymentStatus: "pending",
        status: "pending_payment",
        subtype: "repeat",
      },
    })
    expect(from).toHaveBeenCalledWith("partial_intakes")
    expect(from).toHaveBeenCalledWith("intakes")
  })

  it("refuses to cross an email boundary before loading the intake", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: {
        converted_to_intake_id: INTAKE_ID,
        email: "someone-else@example.com",
      },
      error: null,
    }))
    const from = vi.fn(() => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        gt: vi.fn(() => chain),
        not: vi.fn(() => chain),
        maybeSingle,
      }
      return chain
    })

    const result = await findConvertedPartialIntakeForCheckout(
      { from } as never,
      {
        category: "prescription",
        email: "patient@example.com",
        sessionId: SESSION_ID,
        subtype: "repeat",
      },
    )

    expect(result).toEqual({ kind: "blocked", reason: "identity_mismatch" })
    expect(from).toHaveBeenCalledTimes(1)
  })
})
