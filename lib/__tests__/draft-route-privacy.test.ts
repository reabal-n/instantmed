import { NextRequest, NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  applyRateLimit: vi.fn(),
  createServiceRoleClient: vi.fn(),
  encryptJSONB: vi.fn(),
  decryptJSONB: vi.fn(),
  isMaintenanceModeStrict: vi.fn(),
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock("@/lib/rate-limit/redis", () => ({
  applyRateLimit: mocks.applyRateLimit,
}))

vi.mock("@/lib/feature-flags", () => ({
  isMaintenanceModeStrict: mocks.isMaintenanceModeStrict,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/lib/security/phi-encryption", () => ({
  encryptJSONB: mocks.encryptJSONB,
  decryptJSONB: mocks.decryptJSONB,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}))

const SESSION_ID = "11111111-1111-4111-8111-111111111111"
const FLOW_INSTANCE_ID = "22222222-2222-4222-8222-222222222222"
const encryptedAnswers = {
  ciphertext: "answers-ciphertext",
  encryptedDataKey: "answers-key",
  iv: "answers-iv",
  authTag: "answers-tag",
  keyId: "answers-key-id",
  version: 1,
}
const encryptedIdentity = {
  ciphertext: "identity-ciphertext",
  encryptedDataKey: "identity-key",
  iv: "identity-iv",
  authTag: "identity-tag",
  keyId: "identity-key-id",
  version: 1,
}

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest("https://instantmed.test/api/draft", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  })
}

function makeGetRequest(sessionId = SESSION_ID) {
  return new NextRequest(`https://instantmed.test/api/draft?id=${sessionId}`, {
    method: "GET",
  })
}

function makeDeleteRequest(sessionId: string, flowInstanceId?: string) {
  const params = new URLSearchParams({ id: sessionId })
  if (flowInstanceId) params.set("flow", flowInstanceId)
  return new NextRequest(`https://instantmed.test/api/draft?${params.toString()}`, {
    method: "DELETE",
  })
}

function makeDraftSupabaseMock(
  data: Record<string, unknown> | null = {
      session_id: SESSION_ID,
      expires_at: "2026-05-03T00:00:00.000Z",
      updated_at: "2026-05-02T00:00:00.000Z",
  },
) {
  const maybeSingle = vi.fn(async () => ({
    data,
    error: null,
  }))
  const select = vi.fn(() => ({ maybeSingle }))
  const upsert = vi.fn(() => ({ select }))
  const supabase = {
    from: vi.fn((table: string) => {
      if (table !== "partial_intakes") {
        throw new Error(`Unexpected table ${table}`)
      }
      return { upsert }
    }),
  }

  mocks.createServiceRoleClient.mockReturnValue(supabase)
  return { maybeSingle, upsert }
}

function makeFetchDraftSupabaseMock(data: Record<string, unknown>) {
  const maybeSingle = vi.fn(async () => ({ data, error: null }))
  const is = vi.fn(() => ({ maybeSingle }))
  const gt = vi.fn(() => ({ is }))
  const eq = vi.fn(() => ({ gt }))
  const select = vi.fn(() => ({ eq }))
  const supabase = {
    from: vi.fn((table: string) => {
      if (table !== "partial_intakes") {
        throw new Error(`Unexpected table ${table}`)
      }
      return { select }
    }),
  }

  mocks.createServiceRoleClient.mockReturnValue(supabase)
  return { select }
}

describe("/api/draft privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.applyRateLimit.mockResolvedValue(null)
    mocks.isMaintenanceModeStrict.mockResolvedValue({ enabled: false, message: "" })
    mocks.encryptJSONB
      .mockResolvedValueOnce(encryptedAnswers)
      .mockResolvedValueOnce(encryptedIdentity)
    mocks.decryptJSONB
      .mockResolvedValueOnce({
        medicationName: "test medicine",
        allergies: "penicillin",
      })
      .mockResolvedValueOnce({
        email: "patient@example.test",
        firstName: "Pat",
        lastName: "Smith",
        phone: "0400000000",
        dob: "1990-05-15",
      })
  })

  it("rate limits anonymous draft writes before touching storage", async () => {
    const limited = NextResponse.json({ error: "Too many requests" }, { status: 429 })
    mocks.applyRateLimit.mockResolvedValueOnce(limited)
    const { POST } = await import("@/app/api/draft/route")

    const response = await POST(makePostRequest({
      serviceType: "prescription",
      flowInstanceId: FLOW_INSTANCE_ID,
      answers: { medicationName: "test medicine" },
    }))

    expect(response.status).toBe(429)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(mocks.applyRateLimit).toHaveBeenCalledWith(expect.any(NextRequest), "standard")
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("pauses draft writes and discards during an active maintenance release gate", async () => {
    mocks.isMaintenanceModeStrict.mockResolvedValue({
      enabled: true,
      message: "Back shortly",
    })
    const { DELETE, POST } = await import("@/app/api/draft/route")

    const [postResponse, deleteResponse] = await Promise.all([
      POST(makePostRequest({
        serviceType: "med-cert",
        flowInstanceId: FLOW_INSTANCE_ID,
        answers: { certType: "work" },
      })),
      DELETE(makeDeleteRequest(SESSION_ID, FLOW_INSTANCE_ID)),
    ])

    for (const response of [postResponse, deleteResponse]) {
      expect(response.status).toBe(503)
      expect(response.headers.get("cache-control")).toBe("private, no-store")
      expect(response.headers.get("retry-after")).toBe("30")
    }
    expect(mocks.encryptJSONB).not.toHaveBeenCalled()
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("fails draft mutations closed when maintenance state cannot be confirmed", async () => {
    mocks.isMaintenanceModeStrict.mockRejectedValue(new Error("Feature flag database unavailable"))
    const { DELETE, POST } = await import("@/app/api/draft/route")

    const [postResponse, deleteResponse] = await Promise.all([
      POST(makePostRequest({
        serviceType: "med-cert",
        flowInstanceId: FLOW_INSTANCE_ID,
        answers: { certType: "work" },
      })),
      DELETE(makeDeleteRequest(SESSION_ID, FLOW_INSTANCE_ID)),
    ])

    for (const response of [postResponse, deleteResponse]) {
      expect(response.status).toBe(503)
      expect(response.headers.get("cache-control")).toBe("private, no-store")
      expect(response.headers.get("retry-after")).toBe("30")
    }
    expect(mocks.encryptJSONB).not.toHaveBeenCalled()
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
    expect(mocks.logger.error).toHaveBeenCalledWith(
      "Draft maintenance gate read failed; pausing mutation",
      { error: "Feature flag database unavailable" },
    )
  })

  it("marks validation responses from every draft method private and non-cacheable", async () => {
    const { DELETE, GET, POST } = await import("@/app/api/draft/route")

    const responses = await Promise.all([
      POST(makePostRequest({ serviceType: "unknown" })),
      GET(makeGetRequest("invalid")),
      DELETE(makeDeleteRequest("invalid")),
    ])

    for (const response of responses) {
      expect(response.status).toBe(400)
      expect(response.headers.get("cache-control")).toBe("private, no-store")
    }
  })

  it("stores draft answers, phone, and DOB only in encrypted columns", async () => {
    const { upsert } = makeDraftSupabaseMock()
    const { POST } = await import("@/app/api/draft/route")

    const response = await POST(makePostRequest({
      serviceType: "prescription",
      currentStepId: "medical-history",
      flowInstanceId: FLOW_INSTANCE_ID,
      answers: {
        medicationName: "test medicine",
        allergies: "penicillin",
        symptoms: ["chest pain"],
      },
      identity: {
        email: "patient@example.test",
        firstName: "Pat",
        lastName: "Smith",
        phone: "0400000000",
        dob: "1990-05-15",
      },
    }))

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(mocks.encryptJSONB).toHaveBeenNthCalledWith(1, {
      medicationName: "test medicine",
      allergies: "penicillin",
      symptoms: ["chest pain"],
    })
    expect(mocks.encryptJSONB).toHaveBeenNthCalledWith(2, {
      email: "patient@example.test",
      firstName: "Pat",
      lastName: "Smith",
      phone: "0400000000",
      dob: "1990-05-15",
    })
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      answers: {},
      answers_encrypted: encryptedAnswers,
      email: "patient@example.test",
      first_name: "Pat",
      flow_instance_id: FLOW_INSTANCE_ID,
      last_name: null,
      phone: null,
      identity_encrypted: encryptedIdentity,
    }), { onConflict: "session_id" })
  })

  it("treats a discard-fenced stale write as a private terminal response", async () => {
    makeDraftSupabaseMock(null)
    const { POST } = await import("@/app/api/draft/route")

    const response = await POST(makePostRequest({
      sessionId: SESSION_ID,
      serviceType: "med-cert",
      answers: { certType: "work" },
    }))

    expect(response.status).toBe(410)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    await expect(response.json()).resolves.toEqual({ error: "Draft was discarded" })
    expect(mocks.logger.error).not.toHaveBeenCalled()
  })

  it("treats cross-flow bearer reuse as a private conflict without incident noise", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: null,
      error: { code: "23514", message: "draft_session_flow_mismatch" },
    }))
    const select = vi.fn(() => ({ maybeSingle }))
    const upsert = vi.fn(() => ({ select }))
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn(() => ({ upsert })),
    })
    const { POST } = await import("@/app/api/draft/route")

    const response = await POST(makePostRequest({
      sessionId: SESSION_ID,
      flowInstanceId: FLOW_INSTANCE_ID,
      serviceType: "med-cert",
      answers: { certType: "work" },
    }))

    expect(response.status).toBe(409)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(mocks.logger.error).not.toHaveBeenCalled()
  })

  it("treats cross-service bearer reuse as a private conflict without incident noise", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: null,
      error: { code: "23514", message: "draft_session_service_mismatch" },
    }))
    const select = vi.fn(() => ({ maybeSingle }))
    const upsert = vi.fn(() => ({ select }))
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn(() => ({ upsert })),
    })
    const { POST } = await import("@/app/api/draft/route")

    const response = await POST(makePostRequest({
      sessionId: SESSION_ID,
      flowInstanceId: FLOW_INSTANCE_ID,
      serviceType: "med-cert",
      answers: { certType: "work" },
    }))

    expect(response.status).toBe(409)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    await expect(response.json()).resolves.toEqual({
      error: "Draft session belongs to another flow or service",
    })
    expect(mocks.logger.error).not.toHaveBeenCalled()
  })

  it("discards through the transaction-fenced RPC instead of a direct delete", async () => {
    const rpc = vi.fn(async () => ({ data: true, error: null }))
    mocks.createServiceRoleClient.mockReturnValue({ rpc })
    const { DELETE } = await import("@/app/api/draft/route")

    const response = await DELETE(makeDeleteRequest(SESSION_ID, FLOW_INSTANCE_ID))

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(rpc).toHaveBeenCalledWith("discard_partial_intake_draft", {
      p_session_id: SESSION_ID,
      p_flow_instance_id: FLOW_INSTANCE_ID,
    })
  })

  it("rejects a malformed discard flow fence before touching storage", async () => {
    const { DELETE } = await import("@/app/api/draft/route")

    const response = await DELETE(makeDeleteRequest(SESSION_ID, "not-a-flow-id"))

    expect(response.status).toBe(400)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("treats a cross-flow discard as a private terminal conflict", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { code: "23514", message: "draft_session_flow_mismatch" },
    }))
    mocks.createServiceRoleClient.mockReturnValue({ rpc })
    const { DELETE } = await import("@/app/api/draft/route")

    const response = await DELETE(makeDeleteRequest(SESSION_ID, FLOW_INSTANCE_ID))

    expect(response.status).toBe(409)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(mocks.logger.error).not.toHaveBeenCalled()
  })

  it("reads encrypted draft answers and identity before plaintext fallbacks", async () => {
    makeFetchDraftSupabaseMock({
      session_id: SESSION_ID,
      flow_instance_id: FLOW_INSTANCE_ID,
      service_type: "prescription",
      current_step_id: "medical-history",
      answers: {},
      answers_encrypted: encryptedAnswers,
      identity_encrypted: encryptedIdentity,
      email: "legacy@example.test",
      first_name: "Legacy",
      last_name: null,
      phone: null,
      updated_at: "2026-05-02T00:00:00.000Z",
      expires_at: "2026-05-03T00:00:00.000Z",
      converted_to_intake_id: null,
    })
    const { GET } = await import("@/app/api/draft/route")

    const response = await GET(makeGetRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(mocks.applyRateLimit).toHaveBeenCalledWith(expect.any(NextRequest), "standard")
    expect(mocks.decryptJSONB).toHaveBeenNthCalledWith(1, encryptedAnswers)
    expect(mocks.decryptJSONB).toHaveBeenNthCalledWith(2, encryptedIdentity)
    expect(payload.answers).toEqual({
      medicationName: "test medicine",
      allergies: "penicillin",
    })
    expect(payload.flowInstanceId).toBe(FLOW_INSTANCE_ID)
    expect(payload.identity).toEqual({
      email: "patient@example.test",
      firstName: "Pat",
      lastName: "Smith",
      phone: "0400000000",
      dob: "1990-05-15",
    })
  })

  it("keeps legacy plaintext draft rows readable until expiry", async () => {
    makeFetchDraftSupabaseMock({
      session_id: SESSION_ID,
      service_type: "med-cert",
      current_step_id: "details",
      answers: { reason: "legacy draft answer" },
      answers_encrypted: null,
      identity_encrypted: null,
      email: "legacy@example.test",
      first_name: "Legacy",
      last_name: "Patient",
      phone: "0400000000",
      updated_at: "2026-05-02T00:00:00.000Z",
      expires_at: "2026-05-03T00:00:00.000Z",
      converted_to_intake_id: null,
    })
    const { GET } = await import("@/app/api/draft/route")

    const response = await GET(makeGetRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.decryptJSONB).not.toHaveBeenCalled()
    expect(payload.answers).toEqual({ reason: "legacy draft answer" })
    expect(payload.identity).toEqual({
      email: "legacy@example.test",
      firstName: "Legacy",
      lastName: "Patient",
      phone: "0400000000",
      dob: null,
    })
  })
})
