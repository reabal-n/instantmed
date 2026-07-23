import { describe, expect, it, vi } from "vitest"

import {
  findConvertedPartialIntakeForCheckout,
  markPartialIntakeConverted,
} from "@/lib/request/server-draft-conversion"

const SESSION_ID = "11111111-1111-4111-8111-111111111111"
const INTAKE_ID = "22222222-2222-4222-8222-222222222222"
const FLOW_INSTANCE_ID = "33333333-3333-4333-8333-333333333333"
const OTHER_FLOW_INSTANCE_ID = "44444444-4444-4444-8444-444444444444"

function makeSupabaseMock() {
  const maybeSingle = vi.fn(async () => ({
    data: { session_id: SESSION_ID },
    error: null,
  }))
  const select = vi.fn(() => ({ maybeSingle }))
  const chain = {
    eq: vi.fn(),
    is: vi.fn(),
    select,
  }
  chain.eq.mockReturnValue(chain)
  chain.is.mockReturnValue({ select })
  const update = vi.fn(() => chain)
  const from = vi.fn((table: string) => {
    if (table !== "partial_intakes") {
      throw new Error(`Unexpected table ${table}`)
    }
    return { update }
  })

  return {
    supabase: { from },
    calls: { ...chain, from, maybeSingle, update },
  }
}

describe("server draft conversion marker", () => {
  it("marks only an unconverted partial intake with the new intake id", async () => {
    const { calls, supabase } = makeSupabaseMock()

    const result = await markPartialIntakeConverted(supabase as never, {
      flowInstanceId: FLOW_INSTANCE_ID,
      intakeId: INTAKE_ID,
      sessionId: SESSION_ID,
    })

    expect(result).toEqual({ marked: true, reason: "marked" })
    expect(calls.update).toHaveBeenCalledWith({ converted_to_intake_id: INTAKE_ID })
    expect(calls.eq).toHaveBeenCalledWith("session_id", SESSION_ID)
    expect(calls.eq).toHaveBeenCalledWith("flow_instance_id", FLOW_INSTANCE_ID)
    expect(calls.is).toHaveBeenCalledWith("converted_to_intake_id", null)
  })

  it("does not touch storage when either id is invalid", async () => {
    const { calls, supabase } = makeSupabaseMock()

    const result = await markPartialIntakeConverted(supabase as never, {
      flowInstanceId: FLOW_INSTANCE_ID,
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
        flow_instance_id: FLOW_INSTANCE_ID,
        service_type: "prescription",
      },
      error: null,
    }))
    const intakeMaybeSingle = vi.fn(async () => ({
      data: {
        category: "prescription",
        flow_instance_id: FLOW_INSTANCE_ID,
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
    const rpc = vi.fn(() => ({ maybeSingle: partialMaybeSingle }))

    const result = await findConvertedPartialIntakeForCheckout(
      { from, rpc } as never,
      {
        category: "prescription",
        email: " patient@example.com ",
        flowInstanceId: FLOW_INSTANCE_ID,
        serviceType: "prescription",
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
    expect(rpc).toHaveBeenCalledWith(
      "claim_partial_intake_draft_for_checkout",
      {
        p_flow_instance_id: FLOW_INSTANCE_ID,
        p_service_type: "prescription",
        p_session_id: SESSION_ID,
      },
    )
    expect(from).toHaveBeenCalledWith("intakes")
  })

  it("refuses to cross an email boundary before loading the intake", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: {
        converted_to_intake_id: INTAKE_ID,
        email: "someone-else@example.com",
        flow_instance_id: FLOW_INSTANCE_ID,
        service_type: "prescription",
      },
      error: null,
    }))
    const from = vi.fn()
    const rpc = vi.fn(() => ({ maybeSingle }))

    const result = await findConvertedPartialIntakeForCheckout(
      { from, rpc } as never,
      {
        category: "prescription",
        email: "patient@example.com",
        flowInstanceId: FLOW_INSTANCE_ID,
        serviceType: "prescription",
        sessionId: SESSION_ID,
        subtype: "repeat",
      },
    )

    expect(result).toEqual({ kind: "blocked", reason: "identity_mismatch" })
    expect(from).not.toHaveBeenCalled()
  })

  it("recognizes an unconverted bearer only when it is bound to the checkout flow", async () => {
    const rpc = vi.fn((_name: string, args: { p_flow_instance_id: string }) => {
      const mismatch = args.p_flow_instance_id !== FLOW_INSTANCE_ID
      return {
        maybeSingle: vi.fn(async () => mismatch
          ? {
              data: null,
              error: { code: "23514", message: "draft_session_flow_mismatch" },
            }
          : {
              data: {
                converted_to_intake_id: null,
                email: "patient@example.com",
                flow_instance_id: FLOW_INSTANCE_ID,
                service_type: "prescription",
              },
              error: null,
            }),
      }
    })
    const from = vi.fn()

    await expect(findConvertedPartialIntakeForCheckout(
      { from, rpc } as never,
      {
        category: "prescription",
        email: "patient@example.com",
        flowInstanceId: FLOW_INSTANCE_ID,
        serviceType: "prescription",
        sessionId: SESSION_ID,
        subtype: "repeat",
      },
    )).resolves.toEqual({ kind: "none", reason: "not_converted" })

    await expect(findConvertedPartialIntakeForCheckout(
      { from, rpc } as never,
      {
        category: "prescription",
        email: "patient@example.com",
        flowInstanceId: OTHER_FLOW_INSTANCE_ID,
        serviceType: "prescription",
        sessionId: SESSION_ID,
        subtype: "repeat",
      },
    )).resolves.toEqual({ kind: "blocked", reason: "request_mismatch" })
  })

  it("blocks a bearer presented for another service before checkout", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: null,
      error: { code: "23514", message: "draft_session_service_mismatch" },
    }))
    const rpc = vi.fn(() => ({ maybeSingle }))

    await expect(findConvertedPartialIntakeForCheckout(
      { from: vi.fn(), rpc } as never,
      {
        category: "consult",
        email: "patient@example.com",
        flowInstanceId: FLOW_INSTANCE_ID,
        serviceType: "consult",
        sessionId: SESSION_ID,
        subtype: "ed",
      },
    )).resolves.toEqual({ kind: "blocked", reason: "request_mismatch" })
  })

  it("blocks a checkout whose durable bearer was already discarded", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: null,
      error: { code: "23514", message: "draft_checkout_tombstoned" },
    }))
    const rpc = vi.fn(() => ({ maybeSingle }))

    await expect(findConvertedPartialIntakeForCheckout(
      { from: vi.fn(), rpc } as never,
      {
        category: "prescription",
        email: "patient@example.com",
        flowInstanceId: FLOW_INSTANCE_ID,
        serviceType: "prescription",
        sessionId: SESSION_ID,
        subtype: "repeat",
      },
    )).resolves.toEqual({ kind: "blocked", reason: "discarded" })
  })

  it("fails closed when a valid bearer cannot be verified", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: null,
      error: { code: "08006", message: "connection failure" },
    }))
    const rpc = vi.fn(() => ({ maybeSingle }))

    await expect(findConvertedPartialIntakeForCheckout(
      { from: vi.fn(), rpc } as never,
      {
        category: "prescription",
        email: "patient@example.com",
        flowInstanceId: FLOW_INSTANCE_ID,
        serviceType: "prescription",
        sessionId: SESSION_ID,
        subtype: "repeat",
      },
    )).resolves.toEqual({ kind: "blocked", reason: "query_error" })
  })

  it("fails closed when a converted intake cannot be verified", async () => {
    const partialMaybeSingle = vi.fn(async () => ({
      data: {
        converted_to_intake_id: INTAKE_ID,
        email: "patient@example.com",
        flow_instance_id: FLOW_INSTANCE_ID,
        service_type: "prescription",
      },
      error: null,
    }))
    const intakeMaybeSingle = vi.fn(async () => ({
      data: null,
      error: { code: "08006", message: "connection failure" },
    }))
    const from = vi.fn(() => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        maybeSingle: intakeMaybeSingle,
      }
      return chain
    })
    const rpc = vi.fn(() => ({ maybeSingle: partialMaybeSingle }))

    await expect(findConvertedPartialIntakeForCheckout(
      { from, rpc } as never,
      {
        category: "prescription",
        email: "patient@example.com",
        flowInstanceId: FLOW_INSTANCE_ID,
        serviceType: "prescription",
        sessionId: SESSION_ID,
        subtype: "repeat",
      },
    )).resolves.toEqual({ kind: "blocked", reason: "query_error" })
  })

  it("keeps malformed bearer input on the ordinary fresh-checkout path", async () => {
    const rpc = vi.fn()

    await expect(findConvertedPartialIntakeForCheckout(
      { from: vi.fn(), rpc } as never,
      {
        category: "prescription",
        email: "patient@example.com",
        flowInstanceId: FLOW_INSTANCE_ID,
        serviceType: "prescription",
        sessionId: "not-a-uuid",
        subtype: "repeat",
      },
    )).resolves.toEqual({ kind: "none", reason: "invalid_id" })
    expect(rpc).not.toHaveBeenCalled()
  })
})
