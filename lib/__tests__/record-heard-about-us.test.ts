import { beforeEach, describe, expect, it, vi } from "vitest"

// Shared, per-test-configurable result for the final .select() in the chain.
const selectResult: { data: unknown; error: unknown } = { data: null, error: null }

vi.mock("@/lib/supabase/service-role", () => {
  const builder: Record<string, unknown> = {}
  builder.from = vi.fn(() => builder)
  builder.update = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.is = vi.fn(() => builder)
  builder.select = vi.fn(() => Promise.resolve(selectResult))
  return { createServiceRoleClient: () => builder }
})

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}))

import { recordHeardAboutUs } from "@/lib/analytics/record-heard-about-us"

describe("recordHeardAboutUs", () => {
  beforeEach(() => {
    selectResult.data = null
    selectResult.error = null
  })

  it("rejects an invalid value before touching the DB", async () => {
    expect(await recordHeardAboutUs("intake-1", "tiktok")).toBe("invalid")
  })

  it("rejects a missing intakeId", async () => {
    expect(await recordHeardAboutUs("", "ai")).toBe("invalid")
  })

  it("returns 'recorded' when the write-once update affects a row", async () => {
    selectResult.data = [{ id: "intake-1" }]
    expect(await recordHeardAboutUs("intake-1", "ai")).toBe("recorded")
  })

  it("returns 'noop' when the row is already answered or not found (0 rows)", async () => {
    selectResult.data = []
    expect(await recordHeardAboutUs("intake-1", "friend")).toBe("noop")
  })

  it("returns 'error' when the DB call errors", async () => {
    selectResult.error = { message: "boom" }
    expect(await recordHeardAboutUs("intake-1", "search")).toBe("error")
  })
})
