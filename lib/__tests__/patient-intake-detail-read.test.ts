import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  logError: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: mocks.logError,
    info: vi.fn(),
    warn: vi.fn(),
  }),
}))

function createIntakeRead(result: {
  data: Record<string, unknown> | null
  error: { code: string; message: string } | null
}) {
  const query = {
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
    select: vi.fn(() => query),
  }
  const supabase = {
    from: vi.fn(() => query),
  }
  return { query, supabase }
}

describe("patient intake detail read", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns a clean not-found result when the owned intake does not exist", async () => {
    const harness = createIntakeRead({ data: null, error: null })
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)

    const { getIntakeForPatient } = await import("@/lib/data/intakes/queries")

    await expect(getIntakeForPatient("missing-intake", "patient-1"))
      .resolves.toBeNull()
    expect(harness.query.maybeSingle).toHaveBeenCalledOnce()
    expect(mocks.logError).not.toHaveBeenCalled()
  })

  it("still logs a genuine intake query failure", async () => {
    const queryError = { code: "PGRST500", message: "query failed" }
    const harness = createIntakeRead({ data: null, error: queryError })
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)

    const { getIntakeForPatient } = await import("@/lib/data/intakes/queries")

    await expect(getIntakeForPatient("missing-intake", "patient-1"))
      .resolves.toBeNull()
    expect(mocks.logError).toHaveBeenCalledOnce()
    expect(mocks.logError).toHaveBeenCalledWith(
      "Error fetching intake",
      {},
      expect.objectContaining({ message: "query failed [PGRST500]" }),
    )
  })
})
