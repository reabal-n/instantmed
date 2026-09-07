import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { browserHealth, collectBrowserEvidence } from "@/lib/monitoring/browser-evidence"
import { checkBrowserObserver } from "@/lib/monitoring/browser-observer"
import { type BrowserState, browserStateSchema, type Evidence } from "@/lib/monitoring/monitor-state"

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
function evidence(number: number, outcome = 1, completed = now - 20000): Evidence {
  return { event: 0, id: number, number, attempt: 1, created: completed - 2000, started: completed - 1000, completed, outcome, status: 2 }
}
function fullCache(): BrowserState {
  const cache = Array.from({ length: 10 }, (_, index) => evidence(10 - index))
  return { ...state(), cache, latest: cache[0], success: cache[0], invocation: cache[0], observerOk: true }
}
function store(initial = state(), fail = false) {
  let current = browserStateSchema.parse(initial)
  let version = 1
  const query = { select: () => query, eq: () => query, order: () => query, limit: () => query,
    maybeSingle: async () => ({ data: { metric_value: version, dimensions: structuredClone(current) }, error: null }),
    insert: vi.fn(async () => ({ error: null })),
  }
  // Mirror the persisted schema, monotonic fields and immutable overlap at the
  // RPC boundary. A permissive mock previously accepted the invalid 11-row cache.
  const append = (next: unknown, expected = version) => {
    if (fail) return { error: {}, data: null }
    const parsed = browserStateSchema.safeParse(next)
    if (!parsed.success) return { error: { code: "invalid_snapshot" }, data: null }
    if (version !== expected) return { error: null, data: false }
    const candidate = parsed.data
    if (candidate.enabledAt !== current.enabledAt || candidate.checkedAt <= current.checkedAt
      || candidate.checkedAt > Date.now() || candidate.backoffUntil > Date.now() + 3600000
      || (candidate.completedAt ?? 0) < (current.completedAt ?? 0)) return { error: { code: "invalid_snapshot" }, data: null }
    for (const field of ["latest", "success", "failure", "invocation"] as const) {
      const old = current[field], incoming = candidate[field]
      if (old && (!incoming || incoming.number < old.number || incoming.number === old.number && incoming.attempt < old.attempt)) {
        return { error: { code: "source_regressed" }, data: null }
      }
    }
    for (const old of current.cache) {
      const incoming = candidate.cache.find(item => item.id === old.id && item.attempt === old.attempt)
      if (incoming && JSON.stringify(incoming) !== JSON.stringify(old)) return { error: { code: "immutable_evidence" }, data: null }
    }
    current = candidate; version++
    return { error: null, data: true }
  }
  const rpc = vi.fn(async (_name, args) => append(args.p_state, args.p_expected_version))
  mocks.client.mockReturnValue({ from: () => query, rpc })
  return { read: () => current, query, rpc, append, version: () => version }
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
    expect(fetcher.mock.calls[0][0]).toBe("https://api.github.com/repos/reabal-n/instantmed/actions/workflows/prod-request-flow-synthetic.yml/runs?branch=main&per_page=10")
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
    previous.latest = { event: 0, id: 1, number: 1, attempt: 1, created: now - 370 * 60000, started: now - 365 * 60000, completed: now - 360 * 60000, outcome: 2, status: 2 }
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
  it("persists a completed read and rate-limit backoff with a full cache", async () => {
    const db = store(fullCache())
    const runs = { total_count: 12, workflow_runs: [run(12), run(11)] }
    const fetcher = replies(runs, jobs(12))
    fetcher.mockResolvedValueOnce(new Response("provider detail", { status: 429, headers: { "retry-after": "1200" } }))
    const first = await checkBrowserObserver()
    expect(first).not.toHaveProperty("persistenceAvailable", false)
    expect(first.healthy).toBe(false)
    expect(first).toHaveProperty("unavailableReason", "rate_limited")
    expect(db.version()).toBe(2)
    expect(db.read().cache.map(item => item.number)).toEqual([12, 10, 9, 8, 7, 6, 5, 4, 3, 2])
    expect(db.read().latest).toMatchObject({ number: 12, outcome: 1 })
    expect(db.read().backoffUntil).toBe(now + 1200000)
    vi.setSystemTime(now + 300000)
    const waiting = replies()
    expect((await checkBrowserObserver()).healthy).toBe(false)
    expect(waiting).not.toHaveBeenCalled()
    expect(db.version()).toBe(3)
    expect(mocks.capture.mock.calls.map(call => call[1].tags.incident_status)).toEqual(["active"])
    vi.setSystemTime(now + 1200000)
    const recovery = replies(runs, jobs(11))
    expect((await checkBrowserObserver()).healthy).toBe(true)
    expect(recovery).toHaveBeenCalledTimes(2)
    expect(recovery.mock.calls[1][0]).toContain("runs/11/attempts/1/jobs")
    expect(db.read().cache).toHaveLength(10)
    expect(db.read().backoffUntil).toBe(0)
    expect(mocks.capture.mock.calls.map(call => call[1].tags.incident_status)).toEqual(["active", "recovered"])
  })
  it("keeps both observers' bounded immutable receipts and active backoff after a CAS loss", async () => {
    const initial = fullCache()
    const db = store(initial)
    db.rpc.mockImplementationOnce(async () => {
      const concurrentFailure = evidence(13, 2, now - 5000)
      expect(db.append({ ...initial, checkedAt: now - 1, latest: concurrentFailure, failure: concurrentFailure,
        invocation: concurrentFailure, cache: [concurrentFailure, ...initial.cache.slice(0, 9)],
        observerOk: false, backoffUntil: now + 1800000 })).toEqual({ error: null, data: true })
      return { error: null, data: false }
    })
    replies({ total_count: 11, workflow_runs: [run(12)] }, jobs(12))
    const result = await checkBrowserObserver()
    expect(result).not.toHaveProperty("persistenceAvailable", false)
    expect(result.healthy).toBe(false)
    expect(result).toHaveProperty("unavailableReason", "backoff")
    expect(db.version()).toBe(3)
    expect(db.read().cache.map(item => item.number)).toEqual([13, 12, 10, 9, 8, 7, 6, 5, 4, 3])
    expect(db.read().latest).toMatchObject({ number: 13, outcome: 2 })
    expect(db.read().success).toMatchObject({ number: 12, outcome: 1 })
    expect(db.read().backoffUntil).toBe(now + 1800000)
    expect(db.read().observerOk).toBe(false)
  })
  it("does not repeat alerts when an equally recent observer wins the CAS", async () => {
    const db = store()
    db.rpc.mockImplementationOnce(async (_name, args) => {
      expect(db.append(args.p_state)).toEqual({ error: null, data: true })
      return { error: null, data: false }
    })
    replies({ total_count: 1, workflow_runs: [run(1)] }, jobs(1, "failure"))
    expect((await checkBrowserObserver()).healthy).toBe(false)
    expect(db.rpc).toHaveBeenCalledTimes(1)
    expect(db.version()).toBe(2)
    expect(db.read().failure).toMatchObject({ number: 1, outcome: 2 })
    expect(mocks.capture).not.toHaveBeenCalled()
  })
  it.each([0, 1800000])("reconciles cadence diagnostics with concurrent scheduled proof and backoff %i", async backoff => {
    const manual = { ...evidence(1), event: 1 }
    const initial = { ...state(), cache: [manual], latest: manual, success: manual, invocation: manual }
    const db = store(initial)
    db.rpc.mockImplementationOnce(async () => {
      const scheduled = evidence(2)
      expect(db.append({ ...initial, checkedAt: now - 1, latest: scheduled, success: scheduled,
        invocation: scheduled, cache: [scheduled, manual], observerOk: !backoff,
        backoffUntil: backoff ? now + backoff : 0 })).toEqual({ error: null, data: true })
      return { error: null, data: false }
    })
    replies({ total_count: 1, workflow_runs: [{ ...run(1), event: "workflow_dispatch" }] })
    const result = await checkBrowserObserver()
    expect(result.healthy).toBe(!backoff)
    expect(result.observerOk).toBe(!backoff)
    expect(result).toHaveProperty("unavailableReason", backoff ? "backoff" : undefined)
    expect(browserHealth(db.read(), now).stale).toBe(false)
  })
  it.each(["malformed", "timeout"])("persists partial failure evidence after a second-read %s with a full cache", async failure => {
    const db = store(fullCache())
    const fetcher = replies({ total_count: 12, workflow_runs: [run(12), run(11)] }, jobs(12, "failure"))
    if (failure === "malformed") fetcher.mockResolvedValueOnce(new Response("{}"))
    else fetcher.mockRejectedValueOnce(new DOMException("timeout", "TimeoutError"))
    const result = await checkBrowserObserver()
    expect(result).not.toHaveProperty("persistenceAvailable", false)
    expect(result.healthy).toBe(false)
    expect(result).toHaveProperty("unavailableReason", failure === "malformed" ? "invalid_source" : "transport_error")
    expect(db.version()).toBe(2)
    expect(db.read().cache).toHaveLength(10)
    expect(db.read().latest).toMatchObject({ number: 12, outcome: 2 })
    expect(db.read().backoffUntil).toBe(0)
    expect(mocks.capture).toHaveBeenCalledWith("browser-monitor: browser_failed active", expect.anything())
  })
  it("manual success proves browser execution without recovering scheduled silence", async () => {
    const old = evidence(1, 2, now - 365 * 60000)
    const db = store({ ...state(), latest: old, failure: old, cache: [old] })
    replies({ total_count: 2, workflow_runs: [{ ...run(2), event: "workflow_dispatch" }, run(1)] }, jobs(2))
    expect((await checkBrowserObserver()).healthy).toBe(false)
    expect(db.read().latest).toMatchObject({ number: 2, event: 1, outcome: 1 })
    expect(db.read().completedAt).toBe(now - 10000)
    expect(browserHealth(db.read(), now)).toEqual({ failed: false, stale: true })
    expect(db.read().observerOk).toBe(true)
    expect(mocks.capture).toHaveBeenCalledWith("browser-monitor: browser_stale active", expect.anything())
  })
  it("manual or legacy-only completions leave cadence unknown without inventing a stale incident", async () => {
    const legacy = evidence(1)
    delete legacy.event
    const db = store({ ...state(), latest: legacy, success: legacy, cache: [legacy], completedAt: legacy.completed })
    replies({ total_count: 2, workflow_runs: [{ ...run(2), event: "workflow_dispatch" }, run(1)] }, jobs(2))
    expect((await checkBrowserObserver()).healthy).toBe(false)
    expect(browserHealth(db.read(), now)).toEqual({ failed: false, stale: null })
    expect(db.read().observerOk).toBe(false)
    expect(mocks.capture).not.toHaveBeenCalledWith("browser-monitor: browser_stale active", expect.anything())
    expect(mocks.capture).toHaveBeenCalledWith("browser-monitor: observer_unavailable active", expect.anything())
  })
  it("manual-window eviction keeps cadence unknown and receipts quiet until scheduled proof returns", async () => {
    const cache = Array.from({ length: 10 }, (_, index) => evidence(10 - index, 1, now - 365 * 60000))
    const db = store({ ...state(), cache, latest: cache[0], success: cache[0], invocation: cache[0],
      incidents: [{ metric: 1, severity: 2, count: 1, active: true, at: now - 60000 }] })
    // Twelve main-branch manual runs exceed the ten-run provider window.
    const runs = { total_count: 22, workflow_runs: Array.from({ length: 10 }, (_, index) => ({ ...run(22 - index), event: "workflow_dispatch" })) }
    for (let poll = 0; poll < 5; poll++) {
      vi.setSystemTime(now + poll * 300000)
      const firstNumber = 22 - poll * 2
      replies(runs, jobs(firstNumber, firstNumber === 20 ? "failure" : "success"), jobs(firstNumber - 1))
      expect((await checkBrowserObserver()).healthy).toBe(false)
    }
    expect(db.read().cache).toHaveLength(10)
    expect(db.read().cache.every(item => item.event === 1)).toBe(true)
    expect(browserHealth(db.read(), Date.now()).stale).toBeNull()
    expect(db.read().incidents.find(item => item.metric === 1)?.active).toBe(true)
    const failures = () => mocks.capture.mock.calls.filter(call => call[1].fingerprint[1] === "browser_failed")
    expect(failures().map(call => call[1].tags.incident_status)).toEqual(["active", "recovered"])
    vi.setSystemTime(now + 1500000)
    const stable = replies(runs)
    expect((await checkBrowserObserver()).healthy).toBe(false)
    expect(stable).toHaveBeenCalledTimes(1)
    expect(failures()).toHaveLength(2)
    expect(mocks.capture).not.toHaveBeenCalledWith("browser-monitor: browser_stale recovered", expect.anything())
    vi.setSystemTime(now + 1800000)
    replies({ total_count: 23, workflow_runs: [run(23), ...runs.workflow_runs.slice(0, 9)] }, jobs(23))
    expect((await checkBrowserObserver()).healthy).toBe(true)
    expect(browserHealth(db.read(), Date.now()).stale).toBe(false)
    expect(mocks.capture).toHaveBeenCalledWith("browser-monitor: browser_stale recovered", expect.anything())
    expect(mocks.capture).toHaveBeenCalledWith("browser-monitor: observer_unavailable recovered", expect.anything())
    expect(failures()).toHaveLength(2)
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
    previous.cache = runs.map(item => ({ event: 0, id: item.id, number: item.run_number, attempt: 1, created: now - 60000, started: now - 11000, completed: now - 10000, outcome: 1, status: 2 }))
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
  it("pages a failed poll, recovers on a newer successful poll, then stays quiet", async () => {
    const db = store()
    replies({ total_count: 1, workflow_runs: [run(1)] }, jobs(1, "failure"))
    expect((await checkBrowserObserver()).healthy).toBe(false)
    expect(db.read().latest).toMatchObject({ number: 1, outcome: 2 })
    vi.setSystemTime(now + 300000)
    replies({ total_count: 2, workflow_runs: [run(2), run(1)] }, jobs(2))
    expect((await checkBrowserObserver()).healthy).toBe(true)
    expect(db.read().failure).toMatchObject({ number: 1, outcome: 2 })
    vi.setSystemTime(now + 600000)
    const stable = replies({ total_count: 2, workflow_runs: [run(2), run(1)] })
    expect((await checkBrowserObserver()).healthy).toBe(true)
    expect(stable).toHaveBeenCalledTimes(1)
    const events = mocks.capture.mock.calls.filter(call => call[1].fingerprint[1] === "browser_failed")
    expect(events.map(call => call[1].tags.incident_status)).toEqual(["active", "recovered"])
    expect(db.version()).toBe(4)
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
  it.each(["transport", "shape", "step"])("returns a bounded %s failure code without provider detail or persisted prose", async reason => {
    mocks.cron.mockResolvedValue({ healthy: true, overdue: [] })
    const db = store()
    if (reason === "transport") vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("untrusted provider detail")))
    else if (reason === "shape") replies({ total_count: 1, workflow_runs: [{ ...run(), status: "untrusted provider detail" }] })
    else {
      const renamed = jobs()
      renamed.jobs[0].steps[0].name = "untrusted provider detail"
      replies({ total_count: 1, workflow_runs: [run()] }, renamed)
    }
    const { GET } = await import("@/app/api/cron/health-check/route")
    const response = await GET(new Request("https://example.test/api/cron/health-check") as Parameters<typeof GET>[0])
    const body = await response.json()
    expect(body.checks.browser.unavailableReason).toBe(reason === "transport" ? "transport_error" : reason === "shape" ? "invalid_source" : "step_unavailable")
    expect(body.healthy).toBe(false)
    expect(db.version()).toBe(2)
    expect(db.read()).not.toHaveProperty("unavailableReason")
    expect(JSON.stringify({ body, sentry: mocks.capture.mock.calls })).not.toContain("untrusted provider detail")
  })
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
