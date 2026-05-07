import { NextRequest, NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  applyRateLimit: vi.fn(),
  createServiceRoleClient: vi.fn(),
  encryptJSONB: vi.fn(),
  decryptJSONB: vi.fn(),
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock("@/lib/rate-limit/redis", () => ({
  applyRateLimit: mocks.applyRateLimit,
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

function makeDraftSupabaseMock() {
  const single = vi.fn(async () => ({
    data: {
      session_id: SESSION_ID,
      expires_at: "2026-05-03T00:00:00.000Z",
      updated_at: "2026-05-02T00:00:00.000Z",
    },
    error: null,
  }))
  const select = vi.fn(() => ({ single }))
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
  return { upsert }
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
      })
  })

  it("rate limits anonymous draft writes before touching storage", async () => {
    const limited = NextResponse.json({ error: "Too many requests" }, { status: 429 })
    mocks.applyRateLimit.mockResolvedValueOnce(limited)
    const { POST } = await import("@/app/api/draft/route")

    const response = await POST(makePostRequest({
      serviceType: "prescription",
      answers: { medicationName: "test medicine" },
    }))

    expect(response.status).toBe(429)
    expect(mocks.applyRateLimit).toHaveBeenCalledWith(expect.any(NextRequest), "standard")
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("stores draft answers and phone only in encrypted columns", async () => {
    const { upsert } = makeDraftSupabaseMock()
    const { POST } = await import("@/app/api/draft/route")

    const response = await POST(makePostRequest({
      serviceType: "prescription",
      currentStepId: "medical-history",
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
      },
    }))

    expect(response.status).toBe(200)
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
    })
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      answers: {},
      answers_encrypted: encryptedAnswers,
      email: "patient@example.test",
      first_name: "Pat",
      last_name: null,
      phone: null,
      identity_encrypted: encryptedIdentity,
    }), { onConflict: "session_id" })
  })

  it("reads encrypted draft answers and identity before plaintext fallbacks", async () => {
    makeFetchDraftSupabaseMock({
      session_id: SESSION_ID,
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
    expect(mocks.applyRateLimit).toHaveBeenCalledWith(expect.any(NextRequest), "standard")
    expect(mocks.decryptJSONB).toHaveBeenNthCalledWith(1, encryptedAnswers)
    expect(mocks.decryptJSONB).toHaveBeenNthCalledWith(2, encryptedIdentity)
    expect(payload.answers).toEqual({
      medicationName: "test medicine",
      allergies: "penicillin",
    })
    expect(payload.identity).toEqual({
      email: "patient@example.test",
      firstName: "Pat",
      lastName: "Smith",
      phone: "0400000000",
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
    })
  })
})
