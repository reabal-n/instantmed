import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const harness = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  reads: [] as string[],
  cache: new Map<string, unknown>(),
  throwOnControl: true,
}))
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown, keys: string[]) => (...args: unknown[]) => {
    const key = JSON.stringify([keys, args])
    if (!harness.cache.has(key)) harness.cache.set(key, fn(...args))
    return harness.cache.get(key)
  },
}))
vi.mock("@/lib/data/profiles", () => ({ decryptProfilePhi: (profile: unknown) => profile }))
vi.mock("@/lib/security/phi-field-wrappers", () => ({
  readAnswers: async ({ answers }: { answers: { owner: string } }) => {
    harness.reads.push(answers.owner)
    if (answers.owner === "control" && harness.throwOnControl) throw new Error("Unrelated ciphertext reached decryption")
    return answers
  },
}))
vi.mock("@/lib/doctor/prescribing-identity-blockers", () => ({
  buildPrescribingIdentityBlockerReport: (rows: Array<{ patient: { id: string } }>) => ({
    items: rows.map(row => ({ patientId: row.patient.id })),
  }),
}))
vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: () => client }))

// Execute predicates before returning rows: a missing scope must actually expose
// the unrelated control to the PHI reader, not merely miss a string assertion.
function query() {
  const filters: Array<(row: Record<string, unknown>) => boolean> = []
  let countOnly = false
  const chain = {
    select: (_fields: string, options?: { head?: boolean }) => { countOnly = !!options?.head; return chain },
    eq: (field: string, value: unknown) => { filters.push(row => row[field] === value); return chain },
    in: (field: string, values: unknown[]) => { filters.push(row => values.includes(row[field])); return chain },
    not: (field: string, _operator: string, values: string) => {
      filters.push(row => !values.slice(1, -1).split(",").includes(String(row[field]))); return chain
    },
    like: (field: string, pattern: string) => {
      filters.push(row => String(row[field]).startsWith(pattern.slice(0, -1))); return chain
    },
    or: () => chain, // Every fixture is a prescribing intake.
    order: () => chain,
    limit: () => chain,
    then: (resolve: (value: unknown) => unknown) => {
      const data = harness.rows.filter(row => filters.every(filter => filter(row)))
      return Promise.resolve({ data: countOnly ? null : data, count: data.length, error: null }).then(resolve)
    },
  }
  return chain
}
const client = { from: () => query() }

afterEach(() => vi.unstubAllEnvs())

import { getStaffNavCounts } from "@/lib/data/staff-nav-counts"
import { getPrescribingIdentityBlockerReport } from "@/lib/doctor/patient-identity-report"

function fixture(owner: string, status: string, reference: string, excluded: boolean) {
  return {
    id: owner, patient_id: owner, category: "prescription", status,
    payment_status: "paid", reference_number: reference, exclude_from_reporting: excluded,
    patient: { id: owner }, intake_answers: { answers: { owner } },
  }
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test")
  vi.stubEnv("PLAYWRIGHT", "1")
  vi.stubEnv("VERCEL_ENV", "")
  harness.cache.clear()
  harness.reads.length = 0
  harness.throwOnControl = true
  harness.rows = [
    fixture("owned-paid", "paid", "E2E-OWNED", true),
    fixture("owned-script", "awaiting_script", "E2E-SCRIPT", true),
    fixture("control", "paid", "CONTROL-SYNTHETIC", true),
    fixture("control-script", "awaiting_script", "CONTROL-SCRIPT", true),
    fixture("unmarked", "paid", "E2E-UNMARKED", false),
  ]
})

describe("staff test query isolation", () => {
  it("filters direct identity reads before unrelated ciphertext reaches decryption", async () => {
    const report = await getPrescribingIdentityBlockerReport(client as never)
    expect(report.items).toHaveLength(2)
    expect(harness.reads).toEqual(["owned-paid", "owned-script"])
  })

  it("computes real synthetic navigation counts with the same bounded query scope", async () => {
    expect(await getStaffNavCounts()).toEqual({ prescribingIdentityPatients: 2, scriptsToWrite: 1, inQueue: 1 })
    expect(harness.reads).toEqual(["owned-paid", "owned-script"])
  })

  it.each(["production", "preview"])("does not activate test scoping on Vercel %s", async (deployment) => {
    vi.stubEnv("VERCEL_ENV", deployment)
    await expect(getPrescribingIdentityBlockerReport(client as never)).rejects.toThrow("Unrelated ciphertext")
    expect(harness.reads).toContain("control")
  })

  it("keeps canonical fixture exclusion for ordinary production reads", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("PLAYWRIGHT", "")
    harness.throwOnControl = false
    harness.rows[0].patient_id = "e2e00000-0000-0000-0000-000000000002"
    await getPrescribingIdentityBlockerReport(client as never)
    expect(harness.reads).not.toContain("owned-paid")
    expect(harness.reads).toContain("control")
  })

  it("retains ordinary reads and partitions cached counts when scope changes", async () => {
    harness.throwOnControl = false
    const testCounts = await getStaffNavCounts()
    expect(testCounts.inQueue).toBe(1)
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("PLAYWRIGHT", "")
    const ordinaryCounts = await getStaffNavCounts()
    expect(ordinaryCounts.inQueue).toBe(3)
    expect(ordinaryCounts.prescribingIdentityPatients).toBe(5)
    expect(ordinaryCounts.scriptsToWrite).toBe(2)
    vi.stubEnv("PLAYWRIGHT", "1")
    expect(await getStaffNavCounts()).toEqual(testCounts)
    expect(harness.cache.size).toBe(2)
  })
})
