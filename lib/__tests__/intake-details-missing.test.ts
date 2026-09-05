import { createClient } from "@supabase/supabase-js"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.unmock("@supabase/supabase-js")

const mocks = vi.hoisted(() => ({
  client: vi.fn(),
  error: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: mocks.client }))
vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({ error: mocks.error, warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}))

import { getIntakeWithDetails } from "@/lib/data/intakes/queries"

const intakeId = "00000000-0000-4000-8000-000000000001"

describe("intake detail read failures", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("returns an ordinary missing result without reporting a database incident", async () => {
    const fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      // Match PostgREST: object-mode reads reject zero rows; array-mode reads
      // return [], which maybeSingle converts to an ordinary null result.
      const singular = new Headers(init?.headers).get("Accept") === "application/vnd.pgrst.object+json"
      return new Response(JSON.stringify(singular
        ? { code: "PGRST116", message: "Cannot coerce the result to a single JSON object", details: "The result contains 0 rows" }
        : []), {
        status: singular ? 406 : 200,
        headers: { "Content-Type": "application/json" },
      })
    })
    mocks.client.mockReturnValue(createClient("https://synthetic.supabase.co", "synthetic-key", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch },
    }))

    await expect(getIntakeWithDetails(intakeId)).resolves.toBeNull()
    expect(mocks.error).not.toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("still reports a real database failure", async () => {
    mocks.client.mockReturnValue(createClient("https://synthetic.supabase.co", "synthetic-key", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: vi.fn(async () => new Response(JSON.stringify({
          code: "42501", message: "permission denied", details: "", hint: "",
        }), { status: 403, headers: { "Content-Type": "application/json" } })),
      },
    }))

    await expect(getIntakeWithDetails(intakeId)).resolves.toBeNull()
    expect(mocks.error).toHaveBeenCalledWith("Error fetching intake details", {}, expect.any(Error))
  })
})
