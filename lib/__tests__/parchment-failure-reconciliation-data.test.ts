import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"

import type { ParchmentStandaloneFailureCandidate } from "@/lib/parchment/failure-reconciliation"
import { readStandaloneParchmentPrescriptionEvidence } from "@/lib/parchment/failure-reconciliation-data"

const recoveredFailure: ParchmentStandaloneFailureCandidate = {
  id: "failure-1",
  intakeId: null,
  reason: "intake_correlation_invalid",
  scid: "SCID-standalone",
  patientProfileId: "patient-1",
  partnerPatientId: "patient-1",
}

function makeSupabase(result: {
  data: Array<{ patient_id: string; intake_id: string | null; parchment_reference: string }> | null
  error: { message: string } | null
}) {
  const calls = {
    from: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
  }
  const query: Record<string, unknown> = {}
  query.select = () => query
  query.in = (column: string, values: string[]) => {
    calls.in(column, values)
    return query
  }
  query.is = (column: string, value: null) => {
    calls.is(column, value)
    return query
  }
  query.then = (
    onFulfilled: (value: typeof result) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled, onRejected)
  calls.from.mockReturnValue(query)

  return {
    calls,
    supabase: { from: calls.from } as unknown as SupabaseClient,
  }
}

describe("standalone Parchment prescription evidence read", () => {
  it("reads only exact intake-less SCID evidence", async () => {
    const { calls, supabase } = makeSupabase({
      data: [{
        patient_id: "patient-1",
        intake_id: null,
        parchment_reference: "SCID-standalone",
      }],
      error: null,
    })

    await expect(readStandaloneParchmentPrescriptionEvidence(
      supabase,
      [recoveredFailure],
    )).resolves.toEqual({
      data: [{
        intakeId: null,
        parchmentReference: "SCID-standalone",
        patientId: "patient-1",
      }],
      error: null,
    })
    expect(calls.from).toHaveBeenCalledWith("prescriptions")
    expect(calls.in).toHaveBeenCalledWith("parchment_reference", ["SCID-standalone"])
    expect(calls.is).toHaveBeenCalledWith("intake_id", null)
  })

  it("does not query prescriptions for unrelated failures", async () => {
    const { calls, supabase } = makeSupabase({ data: [], error: null })

    await expect(readStandaloneParchmentPrescriptionEvidence(supabase, [{
      ...recoveredFailure,
      reason: "prescription_sync_failed",
    }])).resolves.toEqual({ data: [], error: null })
    expect(calls.from).not.toHaveBeenCalled()
  })

  it("returns an error so callers keep the original failure visible", async () => {
    const { supabase } = makeSupabase({ data: null, error: { message: "read failed" } })

    await expect(readStandaloneParchmentPrescriptionEvidence(
      supabase,
      [recoveredFailure],
    )).resolves.toEqual({
      data: [],
      error: { message: "read failed" },
    })
  })
})
