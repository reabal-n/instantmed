import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { GET } from "@/app/api/cron/browser-check/route"
import { dispatchBrowserCheck, readScheduledBrowserRunIds } from "@/lib/monitoring/browser-dispatch"

const mocks = vi.hoisted(() => ({ insert: vi.fn(), read: vi.fn(), lock: vi.fn(), heartbeat: vi.fn(), capture: vi.fn() }))
vi.mock("@sentry/nextjs", () => ({ captureMessage: mocks.capture, flush: vi.fn().mockResolvedValue(true) }))
vi.mock("@/lib/monitoring/cron-heartbeat", () => ({ recordCronHeartbeat: mocks.heartbeat }))
vi.mock("@/lib/api/cron-auth", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/api/cron-auth")>(), acquireCronLock: mocks.lock }))
vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: () => ({ from: () => ({ insert: mocks.insert, select: () => ({ eq: () => ({ order: () => ({ limit: mocks.read }) }) }) }) }) }))
const request = (authorization = "Bearer cron-test", agent = "vercel-cron/1.0") => new NextRequest("https://instantmed.com.au/api/cron/browser-check", { headers: { authorization, "user-agent": agent } })
let fetcher: ReturnType<typeof vi.fn>
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("CRON_SECRET", "cron-test")
  vi.stubEnv("VERCEL_ENV", "production")
  vi.stubEnv("GITHUB_BROWSER_MONITOR_TOKEN", "test-repository-token")
  mocks.lock.mockResolvedValue({ acquired: true })
  mocks.insert.mockResolvedValue({ error: null })
  mocks.read.mockResolvedValue({ data: [{ metric_value: 42 }], error: null })
  fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ workflow_run_id: 42 }), { status: 200 }))
  vi.stubGlobal("fetch", fetcher)
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
describe("existing browser workflow dispatch", () => {
  it("records only GitHub's exact returned ID and fixes workflow/ref server-side", async () => {
    expect(await dispatchBrowserCheck()).toBe(42)
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining("/reabal-n/instantmed/actions/workflows/prod-request-flow-synthetic.yml/dispatches"), expect.objectContaining({ body: '{"ref":"main"}', method: "POST", redirect: "error" }))
    expect(mocks.insert).toHaveBeenCalledWith({ metric_name: "browser_scheduled_dispatch", metric_value: 42, dimensions: { requestedAt: expect.any(Number) } })
    expect(await readScheduledBrowserRunIds()).toEqual(new Set([42]))
  })
  it("does not mint a receipt from acceptance without a run ID", async () => {
    fetcher.mockResolvedValue(new Response(null, { status: 204 }))
    await expect(dispatchBrowserCheck()).rejects.toThrow("browser_dispatch_rejected")
    expect(mocks.insert).not.toHaveBeenCalled()
  })
  it("does not retry an ambiguous transport failure", async () => {
    fetcher.mockRejectedValue(new Error("timeout"))
    expect((await GET(request())).status).toBe(503)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.heartbeat).toHaveBeenCalledWith("browser-check", expect.objectContaining({ status: "partial_failure" }))
  })
  it("reports persistence failure instead of claiming success", async () => {
    mocks.insert.mockResolvedValue({ error: { message: "private provider diagnostic" } })
    const response = await GET(request())
    expect(response.status).toBe(503)
    expect(JSON.stringify(await response.json())).not.toContain("private")
  })
  it("never dispatches an unauthenticated request", async () => {
    expect((await GET(request("Bearer wrong"))).status).toBe(401)
    expect(mocks.lock).not.toHaveBeenCalled()
    expect(fetcher).not.toHaveBeenCalled()
  })
  it("requires the production cron context rather than accepting a manual call", async () => {
    expect((await GET(request("Bearer cron-test", "manual-check"))).status).toBe(403)
    vi.stubEnv("VERCEL_ENV", "preview")
    expect((await GET(request())).status).toBe(403)
    expect(fetcher).not.toHaveBeenCalled()
  })
  it("retains the duplicate lock and does not refresh health from a skipped attempt", async () => {
    mocks.lock.mockResolvedValue({ acquired: false, reason: "held" })
    expect((await GET(request())).status).toBe(200)
    expect(mocks.lock).toHaveBeenCalledWith("browser-check", 6600)
    expect(fetcher).not.toHaveBeenCalled()
    expect(mocks.heartbeat).not.toHaveBeenCalled()
  })
  it("fails closed on lock or credential loss", async () => {
    mocks.lock.mockResolvedValue({ acquired: false, reason: "unavailable" })
    expect((await GET(request())).status).toBe(503)
    expect(fetcher).not.toHaveBeenCalled()
    vi.stubEnv("GITHUB_BROWSER_MONITOR_TOKEN", "")
    await expect(dispatchBrowserCheck()).rejects.toThrow("browser_dispatch_not_configured")
    expect(fetcher).not.toHaveBeenCalled()
  })
  it("treats unavailable dispatch provenance as unknown", async () => {
    mocks.read.mockResolvedValue({ data: null, error: { message: "unavailable" } })
    await expect(readScheduledBrowserRunIds()).rejects.toThrow("browser_dispatch_receipts_unavailable")
  })
})
