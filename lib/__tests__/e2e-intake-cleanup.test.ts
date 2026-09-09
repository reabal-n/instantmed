import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const fixture = vi.hoisted(() => ({
  calls: [] as Array<{ table: string; operation: string; column: string; value: unknown }>,
  failedTable: "",
  failedColumn: "",
  transportError: null as Error | null,
  certificates: ["synthetic-certificate-id"] as string[],
}))

// Import the real helper without loading repository credentials or making requests.
vi.mock("@/e2e/load-env", () => ({ loadE2EEnv: vi.fn() }))
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      let operation = ""
      const execute = async (column: string, value: unknown) => {
        fixture.calls.push({ table, operation, column, value })
        if (table === fixture.failedTable && (!fixture.failedColumn || column === fixture.failedColumn)) {
          if (fixture.transportError) throw fixture.transportError
          return { data: null, error: { message: "Synthetic database refusal" } }
        }
        const data = operation === "select"
          ? fixture.certificates.map(id => ({ id }))
          : null
        if (table === "issued_certificates" && operation === "delete") fixture.certificates = []
        return { data, error: null }
      }
      const query = {
        delete() { operation = "delete"; return query },
        select() { operation = "select"; return query },
        eq: execute,
        in: execute,
      }
      return query
    },
  }),
}))

const INTAKE_ID = "11111111-1111-4111-8111-111111111111"

beforeEach(() => {
  vi.resetModules()
  fixture.calls = []
  fixture.failedTable = ""
  fixture.failedColumn = ""
  fixture.transportError = null
  fixture.certificates = ["synthetic-certificate-id"]
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:9")
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-unused-key")
})

afterEach(() => vi.unstubAllEnvs())

describe("cleanupTestIntake", () => {
  it("cleans only the requested intake and its certificates, and permits repeated cleanup", async () => {
    const { cleanupTestIntake } = await import("@/e2e/helpers/db")
    await expect(cleanupTestIntake(INTAKE_ID)).resolves.toBeUndefined()
    const firstPass = [...fixture.calls]
    await expect(cleanupTestIntake(INTAKE_ID)).resolves.toBeUndefined()

    expect(firstPass.map(call => [call.table, call.operation, call.column])).toEqual([
      ["intake_events", "delete", "intake_id"],
      ["intake_documents", "delete", "intake_id"],
      ["email_outbox", "delete", "intake_id"],
      ["ai_audit_log", "delete", "intake_id"],
      ["issued_certificates", "select", "intake_id"],
      ["certificate_audit_log", "delete", "certificate_id"],
      ["issued_certificates", "delete", "intake_id"],
      ["document_drafts", "delete", "intake_id"],
      ["document_drafts", "delete", "request_id"],
      ["email_outbox", "delete", "intake_id"],
      ["intake_answers", "delete", "intake_id"],
      ["intakes", "delete", "id"],
    ])
    for (const call of fixture.calls) {
      expect(call.value).toEqual(call.table === "certificate_audit_log" ? ["synthetic-certificate-id"] : INTAKE_ID)
    }
    expect(fixture.calls.slice(firstPass.length).some(call => call.table === "certificate_audit_log")).toBe(false)
  })

  it.each([
    ["intake_events", "intake_id"],
    ["document_drafts", "intake_id"],
    ["document_drafts", "request_id"],
    ["intake_answers", "intake_id"],
    ["intakes", "id"],
  ])("rejects a returned deletion error for %s.%s", async (table, column) => {
    fixture.failedTable = table
    fixture.failedColumn = column
    const { cleanupTestIntake } = await import("@/e2e/helpers/db")
    await expect(cleanupTestIntake(INTAKE_ID)).rejects.toThrow(`Failed to delete ${table}`)
    expect(fixture.calls.at(-1)).toEqual({ table, operation: "delete", column, value: INTAKE_ID })
  })

  it("propagates an existing certificate artifact cleanup failure", async () => {
    fixture.failedTable = "intake_documents"
    const { cleanupTestIntake } = await import("@/e2e/helpers/db")
    await expect(cleanupTestIntake(INTAKE_ID)).rejects.toThrow("Failed to delete intake documents for reset")
  })

  it("propagates a thrown transport failure", async () => {
    fixture.failedTable = "intake_answers"
    fixture.transportError = new Error("Synthetic transport failure")
    const { cleanupTestIntake } = await import("@/e2e/helpers/db")
    await expect(cleanupTestIntake(INTAKE_ID)).rejects.toBe(fixture.transportError)
  })
})
