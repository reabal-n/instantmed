import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"

import type { ParchmentStandaloneFailureCandidate } from "@/lib/parchment/failure-reconciliation"
import { readParchmentAuditWindow,readStandaloneParchmentPrescriptionEvidence } from "@/lib/parchment/failure-reconciliation-data"

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
  it.each(["capped", "changing"])("never reports complete coverage for a %s audit window", async mode => {
    let pages = 0
    const client = { from: () => {
      const query: Record<string, unknown> = {}
      for (const method of ["select", "eq", "gte", "lte", "contains", "not", "order"]) query[method] = () => query
      query.range = (start: number) => {
        pages += 1
        return Promise.resolve({
          data: Array.from({ length: 500 }, (_, i) => ({ id: `row-${start + i}` })),
          error: null, count: mode === "changing" && pages > 1 ? 5002 : 5001,
        })
      }
      return query
    } } as unknown as SupabaseClient
    const result = await readParchmentAuditWindow(client, "failures", "2026-09-08T00:00:00Z", "2026-09-15T00:00:00Z")
    expect(result.count).toBeNull()
    expect(result.error).not.toBeNull()
    expect(pages).toBe(mode === "capped" ? 10 : 2)
  })
  it("reads failures past the old 50-row window and reports incomplete coverage", async () => {
    const rows = Array.from({ length: 601 }, (_, i) => ({ id: `failure-${i}` }))
    const pages: number[] = []
    const makeClient = (failSecondPage = false) => ({ from: () => {
      const query: Record<string, unknown> = {}
      for (const method of ["select", "eq", "gte", "lte", "contains", "not", "order"]) query[method] = () => query
      query.range = (start: number, end: number) => {
        pages.push(start)
        return Promise.resolve(failSecondPage && start > 0
          ? { data: null, error: { message: "unavailable" }, count: null }
          : { data: rows.slice(start, end + 1), error: null, count: rows.length })
      }
      return query
    } }) as unknown as SupabaseClient
    const result = await readParchmentAuditWindow(makeClient(), "failures", "2026-09-08T00:00:00Z", "2026-09-15T00:00:00Z")
    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(601)
    expect(result.data.at(-1)?.id).toBe("failure-600")
    expect(pages).toEqual([0, 500])
    const incomplete = await readParchmentAuditWindow(makeClient(true), "retries", "2026-09-08T00:00:00Z", "2026-09-15T00:00:00Z")
    expect(incomplete.error).not.toBeNull()
    expect(incomplete.data).toHaveLength(500)
    expect(incomplete.count).toBeNull()
  })
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
