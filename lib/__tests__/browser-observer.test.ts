import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { browserHealth, checkBrowserObserver, collectBrowserEvidence } from "@/lib/monitoring/browser-observer"
import type { BrowserState } from "@/lib/monitoring/monitor-state"

const mocks = vi.hoisted(() => ({ capture: vi.fn(), client: vi.fn(), cron: vi.fn(), heartbeat: vi.fn() }))
vi.mock("@sentry/nextjs", () => ({ captureMessage: mocks.capture, flush: vi.fn().mockResolvedValue(true) }))
vi.mock("@/lib/api/cron-auth", () => ({ verifyCronRequest: () => null }))
vi.mock("@/lib/monitoring/cron-heartbeat", () => ({ checkCronHeartbeats: mocks.cron, recordCronHeartbeat: mocks.heartbeat }))
vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: mocks.client }))
const now = Date.parse("2026-09-06T12:00:00Z")
const iso = (offset: number) => new Date(now + offset).toISOString()
const state = (): BrowserState => ({ enabledAt: now - 86400000, checkedAt: 0, cache: [], incidents: [], observerOk: false, coverageGap: false, backoffUntil: 0 })
function run(number = 1, status = "completed", attempt = 1) {
  return { id: number, run_number: number, run_attempt: attempt, event: "schedule", head_branch: "main", path: ".github/workflows/prod-request-flow-synthetic.yml", created_at: iso(-60000), run_started_at: iso(-50000), status }
}
function jobs(number = 1, conclusion = "success", attempt = 1, offset = -10000) {
  return { total_count: 1, jobs: [{ name: "request-flow-synthetic", run_id: number, run_attempt: attempt, status: "completed", conclusion: "success", steps: [{ name: "Run production request-flow synthetic", status: "completed", conclusion, started_at: iso(offset - 1000), completed_at: iso(offset) }] }] }
}
function replies(...bodies: unknown[]) {
  const fetcher = vi.fn()
  for (const body of bodies) fetcher.mockResolvedValueOnce(new Response(JSON.stringify(body), { status: 200 }))
  vi.stubGlobal("fetch", fetcher)
  return fetcher
}
function store(initial = state(), fail = false) {
  let current = initial
  let version = 1
  const query = { select: () => query, eq: () => query, order: () => query, limit: () => query,
    maybeSingle: async () => ({ data: { metric_value: version, dimensions: current }, error: null }),
    insert: vi.fn(async () => ({ error: null })),
  }
  mocks.client.mockReturnValue({ from: () => query, rpc: vi.fn(async (_name, args) => {
    if (fail) return { error: {}, data: null }
    if (version !== args.p_expected_version) return { error: null, data: false }
    current = args.p_state; version++
    return { error: null, data: true }
  }) })
  return { read: () => current, query, version: () => version }
}
beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now) })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
describe("bounded public GitHub observer", () => {
  it("uses the named browser step timestamps and caches immutable attempts", async () => {
    const fetcher = replies({ total_count: 1, workflow_runs: [run()] }, jobs())
    const first = await collectBrowserEvidence(state(), now)
    expect(first.state.latest).toMatchObject({ completed: now - 10000, started: now - 11000, outcome: 1 })
    expect(first.state.observerOk).toBe(true)
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ total_count: 1, workflow_runs: [run()] })))
    await collectBrowserEvidence(first.state, now)
    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(fetcher.mock.calls[1][0]).toContain("runs/1/attempts/1/jobs")
  })
  it("separates failed browser execution from successful cleanup/workflow", async () => {
    replies({ total_count: 1, workflow_runs: [run()] }, jobs(1, "failure"))
    const result = await collectBrowserEvidence(state(), now)
    expect(browserHealth(result.state, now).failed).toBe(true)
    expect(result.state.failure?.outcome).toBe(2)
  })
  it.each(["queued", "in_progress"])("%s after failure never refreshes browser completion", async status => {
    const previous = state()
    previous.latest = { id: 1, number: 1, attempt: 1, created: now - 370 * 60000, started: now - 365 * 60000, completed: now - 360 * 60000, outcome: 2, status: 2 }
    replies({ total_count: 1, workflow_runs: [run(2, status)] })
    const result = await collectBrowserEvidence(previous, now)
    expect(result.state.latest).toEqual(previous.latest)
    expect(result.state.running?.id).toBe(2)
    expect(browserHealth(result.state, now)).toEqual({ failed: true, stale: true })
  })
  it("skipped execution is unavailable and cannot mint a success", async () => {
    replies({ total_count: 1, workflow_runs: [run()] }, jobs(1, "skipped"))
    const result = await collectBrowserEvidence(state(), now)
    expect(result.state.latest).toBeUndefined()
    expect(result.state.observerOk).toBe(false)
    expect(result.state.cache).toHaveLength(1)
  })
  it("a skipped job without browser steps remains observation unavailable", async () => {
    const skipped = jobs()
    skipped.jobs[0].conclusion = "skipped"
    skipped.jobs[0].steps = []
    replies({ total_count: 1, workflow_runs: [run()] }, skipped)
    const result = await collectBrowserEvidence(state(), now)
    expect(result.state.observerOk).toBe(false)
    expect(result.state.latest).toBeUndefined()
  })
  it("delayed old completion remains stale", async () => {
    const oldRun = { ...run(), created_at: iso(-370 * 60000), run_started_at: iso(-369 * 60000) }
    replies({ total_count: 1, workflow_runs: [oldRun] }, jobs(1, "success", 1, -365 * 60000))
    const result = await collectBrowserEvidence(state(), now)
    expect(browserHealth(result.state, now).stale).toBe(true)
  })
  it.each([401, 429])("HTTP %i preserves prior evidence without green", async status => {
    const previous = state()
    previous.latest = { id: 1, number: 1, attempt: 1, created: now - 60000, started: now - 30000, completed: now - 20000, outcome: 1, status: 2 }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("untrusted provider body", { status })))
    const result = await collectBrowserEvidence(previous, now)
    expect(result.state.latest).toEqual(previous.latest)
    expect(result.state.observerOk).toBe(false)
    if (status === 429) expect(result.state.backoffUntil).toBeGreaterThan(now)
  })
  it("honors durable rate-limit backoff without another request", async () => {
    const fetcher = replies()
    const result = await collectBrowserEvidence({ ...state(), backoffUntil: now + 10000 }, now)
    expect(result.state.observerOk).toBe(false)
    expect(fetcher).not.toHaveBeenCalled()
  })
  it.each([{}, { total_count: 1, workflow_runs: [{ ...run(), created_at: "invalid" }] }, { total_count: 1, workflow_runs: [{ ...run(), created_at: iso(1000) }] }])("rejects malformed/future source evidence", async body => {
    replies(body)
    const result = await collectBrowserEvidence(state(), now)
    expect(result.state.observerOk).toBe(false)
    expect(result.state.latest).toBeUndefined()
  })
  it("handles a fetch timeout as observation failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")))
    expect((await collectBrowserEvidence(state(), now)).state.observerOk).toBe(false)
  })
  it("caps job reads and reports an incomplete window", async () => {
    const fetcher = replies({ total_count: 3, workflow_runs: [run(3), run(2), run(1)] }, jobs(3), jobs(2))
    const result = await collectBrowserEvidence(state(), now)
    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(result.state.observerOk).toBe(false)
    expect(result.state.latest?.number).toBe(3)
  })
  it("a reported lookback gap recovers at a new overlapping verified boundary", async () => {
    const previous = state()
    previous.invocation = { id: 1, number: 1, attempt: 1, created: now - 60000, started: 0, completed: 0, outcome: 0, status: 0 }
    const runs = Array.from({ length: 10 }, (_, i) => run(20 - i))
    previous.cache = runs.map(item => ({ id: item.id, number: item.run_number, attempt: 1, created: now - 60000, started: now - 11000, completed: now - 10000, outcome: 1, status: 2 }))
    replies({ total_count: 20, workflow_runs: runs }, { total_count: 20, workflow_runs: runs })
    const gap = await collectBrowserEvidence(previous, now)
    expect(gap.state.coverageGap).toBe(true)
    expect(gap.state.observerOk).toBe(false)
    const boundary = await collectBrowserEvidence(gap.state, now + 300000)
    expect(boundary.state.coverageGap).toBe(false)
    expect(boundary.state.observerOk).toBe(true)
  })
  it("pages failure and explicit recovery once while measurements continue", async () => {
    const db = store()
    replies({ total_count: 2, workflow_runs: [run(2), run(1)] }, jobs(2), jobs(1, "failure", 1, -20000))
    expect((await checkBrowserObserver()).healthy).toBe(true)
    const browserEvents = mocks.capture.mock.calls.filter(call => call[1].fingerprint[1] === "browser_failed")
    expect(browserEvents.map(call => call[1].tags.incident_status)).toEqual(["active", "recovered"])
    expect(db.read().failure?.id).toBe(1)
    vi.setSystemTime(now + 300000)
    replies({ total_count: 2, workflow_runs: [run(2), run(1)] })
    await checkBrowserObserver()
    expect(mocks.capture.mock.calls.filter(call => call[1].fingerprint[1] === "browser_failed")).toHaveLength(2)
    expect(db.version()).toBe(3)
  })
  it("drains a capped two-poll window without losing older failure and recovery", async () => {
    const db = store()
    const runs = { total_count: 3, workflow_runs: [run(3), run(2), run(1)] }
    const firstFetch = replies(runs, jobs(3), jobs(2))
    expect((await checkBrowserObserver()).healthy).toBe(false)
    expect(firstFetch).toHaveBeenCalledTimes(3)
    expect(db.read().latest?.number).toBe(3)
    vi.setSystemTime(now + 300000)
    const nextFetch = replies(runs, jobs(1, "failure", 1, -20000))
    expect((await checkBrowserObserver()).healthy).toBe(true)
    expect(nextFetch).toHaveBeenCalledTimes(2)
    expect(db.read().latest).toMatchObject({ number: 3, outcome: 1 })
    expect(db.read().failure?.number).toBe(1)
    const events = mocks.capture.mock.calls.filter(call => call[1].fingerprint[1] === "browser_failed")
    expect(events.map(call => call[1].tags.incident_status)).toEqual(["active", "recovered"])
    vi.setSystemTime(now + 600000)
    const repeatFetch = replies(runs)
    await checkBrowserObserver()
    expect(repeatFetch).toHaveBeenCalledTimes(1)
    expect(mocks.capture.mock.calls.filter(call => call[1].fingerprint[1] === "browser_failed")).toHaveLength(2)
  })
  it("newly verified failure still pages if its state append fails", async () => {
    store(state(), true)
    replies({ total_count: 1, workflow_runs: [run()] }, jobs(1, "failure"))
    expect((await checkBrowserObserver()).healthy).toBe(false)
    expect(mocks.capture).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ fingerprint: ["browser-monitor", "browser_failed"] }))
  })
  it("persistence failure fails open and never returns healthy", async () => {
    store(state(), true)
    replies({ total_count: 1, workflow_runs: [run()] }, jobs())
    expect((await checkBrowserObserver()).healthy).toBe(false)
    expect(mocks.capture).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ fingerprint: ["browser-monitor", "observer_unavailable"] }))
    expect(JSON.stringify(mocks.capture.mock.calls)).not.toContain("untrusted provider")
  })
})

describe("independent health-check classification", () => {
  it("retains browser classification when cron health rejects and records final failure", async () => {
    mocks.cron.mockRejectedValue(new Error("cron unavailable"))
    store()
    replies({ total_count: 1, workflow_runs: [run()] }, jobs())
    const { GET } = await import("@/app/api/cron/health-check/route")
    const response = await GET(new Request("https://example.test/api/cron/health-check") as Parameters<typeof GET>[0])
    const body = await response.json()
    expect(body.checks.browser.healthy).toBe(true)
    expect(body.checks.crons.healthy).toBe(false)
    expect(body.healthy).toBe(false)
    expect(mocks.heartbeat).toHaveBeenCalledWith("health-check", expect.objectContaining({ status: "partial_failure" }))
  })
  it("retains cron classification when browser state is unreadable", async () => {
    mocks.cron.mockResolvedValue({ healthy: true, overdue: [] })
    mocks.client.mockImplementation(() => { throw new Error("state unavailable") })
    const { GET } = await import("@/app/api/cron/health-check/route")
    const response = await GET(new Request("https://example.test/api/cron/health-check") as Parameters<typeof GET>[0])
    const body = await response.json()
    expect(body.checks.crons.healthy).toBe(true)
    expect(body.checks.browser.healthy).toBe(false)
    expect(body.healthy).toBe(false)
  })
})
