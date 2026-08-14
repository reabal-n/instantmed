import { readFileSync } from "node:fs"
import { join } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

import { normalizePostHogApiHost } from "@/lib/analytics/posthog-host"
import { waitUntilPostHogFlush } from "@/lib/analytics/posthog-server"
import { REVENUE_PURCHASE_PAYMENT_STATUSES } from "@/lib/monitoring/revenue-safety"

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
      "`${posthogHost}/api/projects/${posthogProjectId}/query/`",
    )
  })
})

describe("PostHog purchase reconciliation", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/analytics/posthog-server")
    vi.doUnmock("@/lib/api/cron-auth")
    vi.doUnmock("@/lib/monitoring/cron-heartbeat")
    vi.doUnmock("@/lib/observability/logger")
    vi.doUnmock("@/lib/observability/sentry")
    vi.doUnmock("@/lib/supabase/service-role")
    vi.doUnmock("@sentry/nextjs")
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("compares reportable ever-paid intakes with unique valid purchase flows", async () => {
    const countResult = Promise.resolve({ count: 4, error: null })
    const query = {
      eq: vi.fn(),
      gte: vi.fn(),
      in: vi.fn(),
      lte: vi.fn(),
      not: vi.fn(),
      or: vi.fn(),
      select: vi.fn(),
      then: countResult.then.bind(countResult),
    }
    query.eq.mockReturnValue(query)
    query.gte.mockReturnValue(query)
    query.in.mockReturnValue(query)
    query.lte.mockReturnValue(query)
    query.not.mockReturnValue(query)
    query.or.mockReturnValue(query)
    query.select.mockReturnValue(query)

    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Response.json({ results: [[4]] }),
    )
    const trackBusinessMetric = vi.fn()
    const releaseCronLock = vi.fn(async () => undefined)

    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://us.i.posthog.com")
    vi.stubEnv("POSTHOG_PROJECT_API_KEY", "phx_test")
    vi.stubEnv("POSTHOG_PROJECT_ID", "277439")
    vi.stubGlobal("fetch", fetchMock)
    vi.doMock("@/lib/analytics/posthog-server", () => ({ trackBusinessMetric }))
    vi.doMock("@/lib/api/cron-auth", () => ({
      acquireCronLock: vi.fn(async () => ({ acquired: true })),
      releaseCronLock,
      verifyCronRequest: vi.fn(() => null),
    }))
    vi.doMock("@/lib/monitoring/cron-heartbeat", () => ({
      recordCronHeartbeat: vi.fn(async () => undefined),
    }))
    vi.doMock("@/lib/observability/logger", () => ({
      createLogger: () => ({ info: vi.fn(), warn: vi.fn() }),
    }))
    vi.doMock("@/lib/observability/sentry", () => ({
      captureCronError: vi.fn(),
    }))
    vi.doMock("@/lib/supabase/service-role", () => ({
      createServiceRoleClient: () => ({ from: vi.fn(() => query) }),
    }))
    vi.doMock("@sentry/nextjs", () => ({ captureMessage: vi.fn() }))

    const { GET } = await import("@/app/api/cron/posthog-reconciliation/route")
    const response = await GET(
      new Request("https://instantmed.test/api/cron/posthog-reconciliation") as Parameters<
        typeof GET
      >[0],
    )
    const payload = await response.json()

    expect(query.in).toHaveBeenCalledWith(
      "payment_status",
      [...REVENUE_PURCHASE_PAYMENT_STATUSES],
    )
    expect(query.not).toHaveBeenCalledWith("paid_at", "is", null)
    expect(query.or).toHaveBeenCalledWith(
      "exclude_from_reporting.is.null,exclude_from_reporting.eq.false",
    )
    expect(query.not).toHaveBeenCalledWith(
      "patient_id",
      "in",
      expect.stringContaining("e2e00000"),
    )

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://us.posthog.com/api/projects/277439/query/")
    const body = JSON.parse(String(init?.body)) as {
      query?: { kind?: string; query?: string }
    }
    expect(body.query?.kind).toBe("HogQLQuery")
    expect(body.query?.query).toContain(
      "count(DISTINCT toString(properties.flow_instance_id))",
    )
    expect(body.query?.query).toContain("event = 'purchase_completed_server'")
    expect(body.query?.query).toContain("properties.is_e2e = false")
    expect(body.query?.query).toContain("AND match(")
    expect(body.query?.query).toContain("toString(properties.flow_instance_id),")

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      breached: false,
      posthog_unique_server_purchase: 4,
      success: true,
      supabase_reportable_ever_paid: 4,
    })
    expect(releaseCronLock).toHaveBeenCalledWith("posthog-reconciliation")
  })
})
