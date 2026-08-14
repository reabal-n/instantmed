import { readFileSync } from "node:fs"
import { join } from "node:path"

import { after } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { normalizePostHogApiHost } from "@/lib/analytics/posthog-host"

vi.mock("next/server", () => ({
  after: vi.fn(),
}))

const reconciliationRouteSource = readFileSync(
  join(process.cwd(), "app/api/cron/posthog-reconciliation/route.ts"),
  "utf8",
)

describe("server-side PostHog delivery", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.mocked(after).mockReset()
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test")
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://us.i.posthog.com")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 200 })),
    )
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("keeps an enqueued server event alive through the active request", async () => {
    const {
      capturePersonlessPostHogEvent,
      shutdownPostHog,
    } = await import("@/lib/analytics/posthog-server")

    capturePersonlessPostHogEvent({
      event: "delivery_lifecycle_test",
      requestId: "request-test-id",
      properties: { outcome: "accepted" },
    })

    await vi.waitFor(() => {
      expect(after).toHaveBeenCalledWith(expect.any(Promise))
    })

    await shutdownPostHog()
  })
})

describe("PostHog API host", () => {
  it.each([
    ["https://us.i.posthog.com", "https://us.posthog.com"],
    ["https://eu.i.posthog.com/", "https://eu.posthog.com"],
    ["https://analytics.example.test/", "https://analytics.example.test"],
  ])("uses an API-capable host for %s", (configuredHost, expectedHost) => {
    expect(normalizePostHogApiHost(configuredHost)).toBe(expectedHost)
  })

  it("normalizes the configured host before reconciliation calls the project API", () => {
    expect(reconciliationRouteSource).toContain("normalizePostHogApiHost(")
    expect(reconciliationRouteSource).toContain(
      "`${posthogHost}/api/projects/${posthogProjectId}/insights/trend/`",
    )
  })
})
