import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  lock: null as string | null,
  from: vi.fn(),
  set: vi.fn(),
  eval: vi.fn(),
}))

vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => ({ set: mocks.set, eval: mocks.eval }) } }))
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }))
vi.mock("@/lib/observability/logger", () => ({ createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) }))
vi.mock("@/lib/data/intakes", () => ({ updateScriptSent: vi.fn() }))
vi.mock("@/lib/audit/compliance-audit", () => ({ logExternalPrescribingIndicated: vi.fn() }))
vi.mock("@/lib/security/audit-log", () => ({ logAuditEvent: vi.fn(), logWebhookFailure: vi.fn() }))
vi.mock("@/lib/parchment/sync-prescription", () => ({ syncParchmentPrescriptionToPms: vi.fn() }))
vi.mock("@/lib/parchment/client", () => ({
  verifyWebhookSignature: () => ({ valid: true }),
  getParchmentEnvironment: () => ({ isSandbox: false }),
}))
vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: () => ({ from: mocks.from }) }))

function request() {
  return new Request("http://localhost/api/webhooks/parchment", {
    method: "POST",
    headers: { "X-Webhook-Signature": "test" },
    body: JSON.stringify({
      event_id: "evt-lock-test", event_type: "prescription.created",
      organization_id: "org-test", partner_id: "partner-test", timestamp: "2026-09-05T00:00:00Z",
      data: {
        patient_id: "patient-test", partner_patient_id: "11111111-1111-4111-8111-111111111111",
        user_id: "doctor-test", scid: "SCID-LOCK-TEST",
      },
    }),
  })
}

describe("Parchment callback processing leases", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token")
    vi.stubEnv("PARCHMENT_WEBHOOK_SECRET", "test-secret")
    vi.stubEnv("PARCHMENT_ORGANIZATION_ID", "org-test")
    vi.stubEnv("PARCHMENT_PARTNER_ID", "partner-test")
    mocks.lock = null
    mocks.set.mockImplementation(async (_key: string, token: string) => {
      if (mocks.lock) return null
      mocks.lock = token
      return "OK"
    })
    mocks.eval.mockImplementation(async (_script: string, _keys: string[], [token]: string[]) => {
      if (mocks.lock !== token) return 0
      mocks.lock = null
      return 1
    })
    mocks.from.mockImplementation(() => { throw new Error("Temporary database failure") })
  })
  afterAll(() => vi.unstubAllEnvs())

  it("asks concurrent deliveries to retry instead of acknowledging unrecorded evidence", async () => {
    mocks.lock = "another-delivery"
    const { POST } = await import("@/app/api/webhooks/parchment/route")
    const response = await POST(request())
    expect(response.status).toBe(503)
    expect(response.headers.get("Retry-After")).toBe("5")
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.lock).toBe("another-delivery")
  })

  it("releases a failed attempt so an immediate retry reaches persistence", async () => {
    const { POST } = await import("@/app/api/webhooks/parchment/route")
    expect((await POST(request())).status).toBe(500)
    expect(mocks.lock).toBeNull()
    expect((await POST(request())).status).toBe(500)
    expect(mocks.from).toHaveBeenCalledTimes(2)
  })

  it("cannot release a replacement lease after its own lease expired", async () => {
    mocks.from.mockImplementation(() => {
      mocks.lock = "newer-delivery"
      throw new Error("Delayed failure")
    })
    const { POST } = await import("@/app/api/webhooks/parchment/route")
    expect((await POST(request())).status).toBe(500)
    expect(mocks.lock).toBe("newer-delivery")
  })

  it("still reaches database idempotency when Redis is unavailable", async () => {
    mocks.set.mockRejectedValueOnce(new Error("Redis unavailable"))
    const { POST } = await import("@/app/api/webhooks/parchment/route")
    expect((await POST(request())).status).toBe(500)
    expect(mocks.from).toHaveBeenCalledOnce()
    expect(mocks.eval).not.toHaveBeenCalled()
  })
})
