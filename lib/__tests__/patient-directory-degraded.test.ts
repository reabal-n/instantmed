import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it, vi } from "vitest"

import { ADMIN_LEDGER_PATIENT_SEARCH_FIELDS } from "@/lib/dashboard/admin-ledger-filters"
import { getPatientDirectoryPage } from "@/lib/data/patient-directory"
import { getDoctorAccessiblePatientScope } from "@/lib/doctor/patient-access"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

function createChain(result: { data: unknown[] | null; error: { message: string } | null; count?: number | null }) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    in: vi.fn(() => chain),
    not: vi.fn(() => chain),
    or: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range: vi.fn(async () => result),
    limit: vi.fn(async () => result),
  }
  return chain
}

describe("patient directory degraded reads", () => {
  it("marks the directory unavailable instead of returning an authoritative zero", async () => {
    const profiles = createChain({
      data: null,
      error: { message: "profiles unavailable" },
      count: null,
    })
    mocks.createServiceRoleClient.mockReturnValue({ from: vi.fn(() => profiles) })

    const result = await getPatientDirectoryPage({ page: 1 })

    expect(result.patients).toEqual([])
    expect(result.total).toBeNull()
    expect(result.degradedSources).toContain("profiles")
  })

  it("marks a partial doctor relationship scope as degraded", async () => {
    const results = new Map<string, { data: unknown[] | null; error: { message: string } | null }>([
      ["intakes", { data: [{ patient_id: "patient-a" }], error: null }],
      ["script_tasks", { data: null, error: { message: "script tasks unavailable" } }],
      ["issued_certificates", { data: [], error: null }],
      ["patient_notes", { data: [], error: null }],
    ])
    const supabase = {
      from: vi.fn((table: string) => createChain(results.get(table) ?? { data: [], error: null })),
    }

    const result = await getDoctorAccessiblePatientScope("doctor-a", supabase as never)

    expect(result.ids).toEqual(new Set(["patient-a"]))
    expect(result.degraded).toBe(true)
  })

  it("does not advertise phone search without a queryable encrypted-phone index", async () => {
    const profiles = createChain({ data: [], error: null, count: 0 })
    mocks.createServiceRoleClient.mockReturnValue({ from: vi.fn(() => profiles) })

    await getPatientDirectoryPage({ page: 1, search: "sample" })

    expect(profiles.or).toHaveBeenCalledWith(
      "full_name.ilike.%sample%,email.ilike.%sample%,suburb.ilike.%sample%",
    )
    expect(ADMIN_LEDGER_PATIENT_SEARCH_FIELDS).toEqual([
      "full_name",
      "email",
      "suburb",
      "state",
    ])

    const directoryClient = readFileSync(
      join(process.cwd(), "app/doctor/patients/patients-list-client.tsx"),
      "utf8",
    )
    const ledgerClient = readFileSync(
      join(process.cwd(), "app/admin/intakes/intakes-ledger-client.tsx"),
      "utf8",
    )
    expect(directoryClient).not.toContain("or phone")
    expect(ledgerClient).not.toContain("email, phone")
  })

  it("renders an explicit unavailable state when authoritative directory reads fail", () => {
    const source = readFileSync(
      join(process.cwd(), "app/doctor/patients/patients-list-client.tsx"),
      "utf8",
    )

    expect(source).toContain("degradedSources")
    expect(source).toContain("Patient directory unavailable")
    expect(source).toContain("Request history unavailable")
    expect(source).toContain("Patient count unavailable")
  })
})
