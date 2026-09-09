import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  reads: [] as string[],
  fetched: [] as string[],
  allowed: true,
  throwOnControl: true,
}))
vi.mock("@/lib/security/phi-field-wrappers", () => ({
  readAnswers: async ({ answers }: { answers: { owner: string } }) => {
    state.reads.push(answers.owner)
    if (answers.owner === "control" && state.throwOnControl) throw new Error("Control reached PHI read")
    return answers
  },
}))
vi.mock("@/lib/doctor/renewal-detection", () => ({ detectRenewalsForIntakes: async () => new Map() }))
// Capability calculation has its own tests. This tests that neither the new SQL
// scope nor any count/history query can discard the existing capability filter.
vi.mock("@/lib/doctor/queue-capability-scope", () => ({
  buildDoctorQueueServiceFilter: () => state.allowed ? "category.eq.consult" : "id.is.null",
}))
vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: () => client }))

function query(table: string) {
  const filters: Array<(row: Record<string, unknown>) => boolean> = []
  let countOnly = false
  let single = false
  const chain = {
    select: (_fields: string, opts?: { head?: boolean }) => { countOnly = !!opts?.head; return chain },
    eq: (field: string, value: unknown) => { filters.push(row => row[field] === value); return chain },
    in: (field: string, values: unknown[]) => { filters.push(row => values.includes(row[field])); return chain },
    like: (field: string, pattern: string) => { filters.push(row => String(row[field]).startsWith(pattern.slice(0, -1))); return chain },
    not: (field: string, op: string, value: unknown) => {
      if (op === "in") filters.push(row => !String(value).slice(1, -1).split(",").includes(String(row[field])))
      else filters.push(row => row[field] !== value && JSON.stringify(row[field]) !== value)
      return chain
    },
    or: (expression: string) => {
      if (expression === "id.is.null") filters.push(() => false)
      else if (expression === "category.eq.consult") filters.push(row => row.category === "consult")
      else if (expression === "ai_approved.is.false,ai_approved.is.null") filters.push(row => row.ai_approved !== true)
      else throw new Error("Unsupported query expression")
      return chain
    },
    gte: (field: string, value: string) => { filters.push(row => String(row[field]) >= value); return chain },
    order: () => chain,
    limit: () => chain,
    range: () => chain,
    maybeSingle: () => { single = true; return chain },
    single: () => Promise.resolve({ data: { role: "doctor", doctor_available: true }, error: null }),
    then: (resolve: (value: unknown) => unknown) => {
      const data = table === "services" ? [] : state.rows.filter(row => filters.every(filter => filter(row)))
      if (!countOnly) state.fetched.push(...data.map(row => String(row.id)))
      return Promise.resolve({ data: countOnly ? null : single ? data[0] ?? null : data, count: data.length, error: null }).then(resolve)
    },
  }
  return chain
}
const client = { from: (table: string) => query(table) }
import { getDoctorQueue, getRecentlyCompletedIntakes } from "@/lib/data/intakes/queries"

function row(id: string, reference: string, excluded: boolean, status = "paid") {
  return {
    id, patient_id: id, reference_number: reference, exclude_from_reporting: excluded,
    category: "consult", subtype: "weight_loss", status, payment_status: "paid",
    patient: { full_name: "Synthetic", id }, service: { type: "consult" },
    answers: [{ answers: { owner: id } }], reviewed_by: "doctor",
    reviewed_at: new Date().toISOString(), ai_approved: false,
  }
}
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("PLAYWRIGHT", "1"); vi.stubEnv("VERCEL_ENV", "")
  state.rows = [row("owned", "E2E-OWNED", true), row("control", "CONTROL-SYNTHETIC", true), row("unmarked", "E2E-UNMARKED", false)]
  state.reads = []; state.fetched = []; state.allowed = true; state.throwOnControl = true
})
afterEach(() => vi.unstubAllEnvs())

describe("doctor queue synthetic SQL boundary", () => {
  it("filters rows, counts and oldest selection before reading unrelated answers", async () => {
    const result = await getDoctorQueue({ doctorId: "doctor" })
    expect(result.data.map(item => item.id)).toEqual(["owned"])
    expect(result.total).toBe(1)
    expect(result.statusCounts?.all).toBe(1)
    expect(result.globalStatusCounts?.all).toBe(1)
    expect(state.fetched).not.toContain("control")
    expect(state.reads).toEqual(["owned"])
  })
  it("preserves a regular doctor's capability restriction", async () => {
    state.allowed = false
    const result = await getDoctorQueue({ doctorId: "doctor" })
    expect(result.data).toEqual([])
    expect(result.total).toBe(0)
    expect(state.reads).toEqual([])
  })
  it.each(["production", "preview"])("does not activate test scoping on Vercel %s", async deployment => {
    vi.stubEnv("VERCEL_ENV", deployment)
    await expect(getDoctorQueue({ doctorId: "doctor" })).rejects.toThrow("Control reached PHI read")
  })
  it("preserves explicit admin seeded opt-in in ordinary mode", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("PLAYWRIGHT", "")
    state.rows = [row("owned", "E2E-OWNED", true)]
    state.rows[0].patient_id = "e2e00000-0000-0000-0000-000000000002"
    expect((await getDoctorQueue()).data).toEqual([])
    expect((await getDoctorQueue({ allowSeeded: true })).data).toHaveLength(1)
  })
  it("scopes both auto-issued history streams before fetching patient names", async () => {
    state.rows.forEach(item => {
      item.status = "approved"
      item.category = "medical_certificate"
      item.ai_approved = true
      item.ai_approved_at = new Date().toISOString()
      item.risk_flags = ["synthetic-flag"]
    })
    const result = await getRecentlyCompletedIntakes({ reviewerId: "doctor", includeAutoIssued: true })
    expect(result.data.map(item => item.id)).toEqual(["owned"])
    expect(state.fetched).toEqual(["owned", "owned"])
  })
  it("scopes adjacent completed history before fetching patient names", async () => {
    state.rows.forEach(item => { item.status = "completed" })
    const result = await getRecentlyCompletedIntakes({ reviewerId: "doctor" })
    expect(result.data.map(item => item.id)).toEqual(["owned"])
    expect(state.fetched).toEqual(["owned"])
  })
})
