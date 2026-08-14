import { readFileSync } from "node:fs"
import { join } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

import { normalizePostHogApiHost } from "@/lib/analytics/posthog-host"
import { waitUntilPostHogFlush } from "@/lib/analytics/posthog-server"

const reconciliationRouteSource = readFileSync(
  join(process.cwd(), "app/api/cron/posthog-reconciliation/route.ts"),
  "utf8",
)

describe("server-side PostHog delivery", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("registers a PostHog flush with an active Next request", () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs")
    const after = vi.fn()
    const flushPromise = Promise.resolve()

    waitUntilPostHogFlush(flushPromise, () => after)

    expect(after).toHaveBeenCalledWith(flushPromise)
  })

  it("does not load the Next server runtime from a standalone Node process", () => {
    vi.stubEnv("NEXT_RUNTIME", "")
    const loadAfter = vi.fn()

    waitUntilPostHogFlush(Promise.resolve(), loadAfter)

    expect(loadAfter).not.toHaveBeenCalled()
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
