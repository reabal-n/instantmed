import { describe, expect, it, vi } from "vitest"

import { warmE2EBrowserBootRoutes } from "../../e2e/helpers/dev-server-warmup"

describe("E2E browser boot warmup", () => {
  it("compiles client-fetched public routes before a browser can trigger dev hot refresh", async () => {
    const consumed: string[] = []
    const fetcher = vi.fn(async (input: string | URL) => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => {
        consumed.push(String(input))
        return new ArrayBuffer(0)
      },
    }))

    await warmE2EBrowserBootRoutes("http://localhost:3001", fetcher)

    expect(fetcher.mock.calls.map(([input]) => String(input))).toEqual([
      "http://localhost:3001/api/availability",
      "http://localhost:3001/api/last-reviewed",
    ])
    expect(consumed).toEqual([
      "http://localhost:3001/api/availability",
      "http://localhost:3001/api/last-reviewed",
    ])
  })

  it("fails setup when a browser boot route cannot be compiled successfully", async () => {
    const fetcher = vi.fn(async () => ({
      ok: false,
      status: 503,
      arrayBuffer: async () => new ArrayBuffer(0),
    }))

    await expect(
      warmE2EBrowserBootRoutes("http://localhost:3001", fetcher),
    ).rejects.toThrow("E2E dev-server warmup failed for /api/availability (503)")
  })
})
