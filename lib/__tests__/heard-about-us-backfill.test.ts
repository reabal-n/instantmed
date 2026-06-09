import { describe, expect, it, vi } from "vitest"

import { SEEDED_E2E_PATIENT_PROFILE_ID } from "@/lib/data/seeded-e2e-data"

// Per-table results for the two queries the finder runs.
const tables: Record<string, { data: unknown; error: unknown }> = {
  intakes: { data: [], error: null },
  email_outbox: { data: [], error: null },
}

vi.mock("@/lib/supabase/service-role", () => {
  const make = (table: string) => {
    const b: Record<string, unknown> = {}
    for (const m of ["select", "in", "is", "eq", "order"]) b[m] = () => b
    b.then = (res: (v: unknown) => unknown) =>
      Promise.resolve(tables[table] ?? { data: [], error: null }).then(res)
    return b
  }
  return { createServiceRoleClient: () => ({ from: (t: string) => make(t) }) }
})

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}))

import { findHeardAboutUsBackfillCandidates } from "@/lib/email/heard-about-us-backfill"

const patient = (email: string | null, opts: { first?: string; bounced?: boolean } = {}) => ({
  email,
  first_name: opts.first ?? "X",
  email_bounced: opts.bounced ?? false,
})

describe("findHeardAboutUsBackfillCandidates", () => {
  it("dedups per patient and filters the cohort correctly", async () => {
    // Rows arrive created_at DESC (the query orders desc), so the first row per
    // patient is their most recent intake.
    tables.intakes = {
      error: null,
      data: [
        { id: "i1", patient_id: "pA", referrer: null, exclude_from_reporting: false, patient: patient("a@x.com", { first: "Ann" }) }, // keep
        { id: "i1b", patient_id: "pA", referrer: null, exclude_from_reporting: false, patient: patient("a@x.com") }, // dup patient -> skip
        { id: "i2", patient_id: "pB", referrer: "https://google.com", exclude_from_reporting: false, patient: patient("b@x.com") }, // external referrer -> skip
        { id: "i3", patient_id: "pC", referrer: "/request", exclude_from_reporting: false, patient: patient("c@x.com") }, // self-path referrer -> keep
        { id: "i4", patient_id: SEEDED_E2E_PATIENT_PROFILE_ID, referrer: null, exclude_from_reporting: false, patient: patient("seed@x.com") }, // seeded -> skip
        { id: "i5", patient_id: "pD", referrer: null, exclude_from_reporting: true, patient: patient("d@x.com") }, // excluded-from-reporting -> skip
        { id: "i6", patient_id: "pE", referrer: null, exclude_from_reporting: false, patient: patient("e@x.com", { bounced: true }) }, // bounced -> skip
        { id: "i7", patient_id: "pF", referrer: null, exclude_from_reporting: false, patient: patient("f@x.com") }, // already-asked -> skip
        { id: "i8", patient_id: "pG", referrer: null, exclude_from_reporting: false, patient: patient(null) }, // no email -> skip
      ],
    }
    tables.email_outbox = { error: null, data: [{ patient_id: "pF" }] }

    const candidates = await findHeardAboutUsBackfillCandidates()
    expect(candidates.map((c) => c.patientId).sort()).toEqual(["pA", "pC"])
    const ann = candidates.find((c) => c.patientId === "pA")
    expect(ann).toEqual({ intakeId: "i1", patientId: "pA", email: "a@x.com", firstName: "Ann" })
  })

  it("returns [] on a query error", async () => {
    tables.intakes = { data: null, error: { message: "boom" } }
    tables.email_outbox = { data: [], error: null }
    expect(await findHeardAboutUsBackfillCandidates()).toEqual([])
  })
})
