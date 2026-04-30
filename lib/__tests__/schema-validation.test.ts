import { describe, expect, it, vi } from "vitest"

const selectCalls: string[] = []

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => ({
      select: (columns: string) => {
        selectCalls.push(`${table}:${columns}`)
        return {
          limit: async () => ({ error: null }),
        }
      },
    }),
    rpc: async () => ({ error: null }),
  }),
}))

describe("schema validation", () => {
  it("checks prescribing identity columns needed for Parchment readiness", async () => {
    selectCalls.length = 0
    const { validateSchema } = await import("@/lib/validation/schema-validation")

    const result = await validateSchema()

    expect(result.valid).toBe(true)
    const profileSelect = selectCalls.find((call) => call.startsWith("profiles:"))
    expect(profileSelect).toBeDefined()
    expect(profileSelect).toContain("date_of_birth")
    expect(profileSelect).toContain("sex")
    expect(profileSelect).toContain("phone")
    expect(profileSelect).toContain("medicare_number")
    expect(profileSelect).toContain("medicare_irn")
    expect(profileSelect).toContain("medicare_expiry")
    expect(profileSelect).toContain("address_line1")
    expect(profileSelect).toContain("suburb")
    expect(profileSelect).toContain("state")
    expect(profileSelect).toContain("postcode")
    expect(profileSelect).toContain("parchment_patient_id")
  })
})
