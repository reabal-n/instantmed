import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  verify: vi.fn(), limit: vi.fn(), single: vi.fn(), send: vi.fn(), user: vi.fn(),
  csrf: vi.fn(), ip: vi.fn(),
}))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/constants", () => ({ APP_URL: "http://localhost:3060" }))
vi.mock("@/lib/crypto/patient-request-access-token", () => ({
  PATIENT_REQUEST_ACCESS_COOKIE: "instantmed_patient_request_access",
  verifyPatientRequestAccessToken: mocks.verify,
}))
vi.mock("@/lib/rate-limit/redis", () => ({
  checkServerActionRateLimit: mocks.limit, getClientIdentifier: mocks.ip,
}))
vi.mock("@/lib/security/csrf", () => ({ requireValidCsrf: mocks.csrf }))
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signInWithOtp: mocks.send } }),
}))
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.single }) }) }),
    auth: { admin: { getUserById: mocks.user } },
  }),
}))

import { POST } from "@/app/track/request/access-link/route"
import { requestAccessMagicLink } from "@/lib/auth/request-access-magic-link"

const input = { capabilityCookie: "private-capability", ipKey: "192.0.2.9" }
const patient = { email: "owner@example.test", role: "patient", auth_user_id: null,
  account_closed_at: null, merged_into_profile_id: null }
const accepted = { accepted: true }

beforeEach(() => {
  vi.resetAllMocks()
  mocks.verify.mockReturnValue({ intakeId: "private-intake" })
  mocks.limit.mockResolvedValue({ success: true })
  mocks.single.mockResolvedValue({ data: { patient }, error: null })
  mocks.send.mockResolvedValue({ data: {}, error: null })
  mocks.csrf.mockResolvedValue(null)
  mocks.ip.mockReturnValue(input.ipKey)
  mocks.user.mockResolvedValue({ data: { user: { email: patient.email } }, error: null })
})

describe("tracker access email", () => {
  it("sends only to the server-resolved mailbox with a fixed clean PKCE return", async () => {
    expect(await requestAccessMagicLink(input)).toEqual(accepted)
    expect(mocks.send).toHaveBeenCalledExactlyOnceWith({ email: patient.email, options: {
      shouldCreateUser: true,
      emailRedirectTo: "http://localhost:3060/auth/callback?next=%2Fauth%2Fpost-signin%3Fredirect%3D%252Ftrack%252Frequest",
    } })
    expect(mocks.limit).toHaveBeenCalledTimes(2)
    const keys = JSON.stringify(mocks.limit.mock.calls)
    for (const secret of [input.capabilityCookie, input.ipKey, patient.email, "private-intake"]) {
      expect(keys).not.toContain(secret)
    }
  })

  it.each(["missing", "invalid", "expired"])("does not send for %s capability", async (kind) => {
    mocks.verify.mockReturnValue(null)
    expect(await requestAccessMagicLink({ ...input, capabilityCookie: kind === "missing" ? undefined : kind })).toEqual(accepted)
    expect(mocks.single).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it.each([
    { account_closed_at: "2026-09-01" }, { merged_into_profile_id: "other-profile" },
    { role: "admin" }, { email: null },
  ])("does not send for ineligible profiles: %j", async (overrides) => {
    mocks.single.mockResolvedValue({ data: { patient: { ...patient, ...overrides } }, error: null })
    expect(await requestAccessMagicLink(input)).toEqual(accepted)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it("handles joined arrays and verifies a linked Auth mailbox", async () => {
    mocks.single.mockResolvedValue({ data: { patient: [{ ...patient, auth_user_id: "owner-auth" }] }, error: null })
    expect(await requestAccessMagicLink(input)).toEqual(accepted)
    expect(mocks.user).toHaveBeenCalledWith("owner-auth")
    expect(mocks.send).toHaveBeenCalledTimes(1)
  })

  it("does not send when the linked Auth account has a different mailbox", async () => {
    mocks.single.mockResolvedValue({ data: { patient: { ...patient, auth_user_id: "wrong-auth" } }, error: null })
    mocks.user.mockResolvedValue({ data: { user: { email: "other@example.test" } }, error: null })
    expect(await requestAccessMagicLink(input)).toEqual(accepted)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it.each([0, 1])("fails closed at rate-limit bucket %s, including replay", async (bucket) => {
    mocks.limit.mockReset()
    if (bucket) mocks.limit.mockResolvedValueOnce({ success: true })
    mocks.limit.mockResolvedValue({ success: false })
    expect(await requestAccessMagicLink(input)).toEqual(accepted)
    expect(mocks.single).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it.each(["database", "provider", "rate-limit"])("suppresses %s exceptions without exposing payloads", async (boundary) => {
    const failure = new Error("private-mailbox token=private-token")
    if (boundary === "database") mocks.single.mockRejectedValue(failure)
    if (boundary === "provider") mocks.send.mockRejectedValue(failure)
    if (boundary === "rate-limit") mocks.limit.mockRejectedValue(failure)
    expect(await requestAccessMagicLink(input)).toEqual(accepted)
  })
})

describe("POST /track/request/access-link", () => {
  function request(body?: string) {
    return new NextRequest("http://localhost:3060/track/request/access-link", {
      method: "POST", body, headers: { cookie: "instantmed_patient_request_access=private-capability" },
    })
  }
  it("uses only the HttpOnly cookie and emits a private uniform response", async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(accepted)
    expect(response.headers.get("cache-control")).toContain("no-store")
    expect(response.headers.get("referrer-policy")).toBe("no-referrer")
    expect(mocks.verify).toHaveBeenCalledWith(input.capabilityCookie)
    expect(mocks.send).toHaveBeenCalledTimes(1)
  })
  it.each(["csrf", "body"])("ignores invalid %s without sending or revealing an outcome", async (kind) => {
    if (kind === "csrf") mocks.csrf.mockResolvedValue(new Response("Forbidden", { status: 403 }))
    const response = await POST(request(kind === "body" ? '{"email":"attacker@example.test"}' : undefined))
    expect(response.status).toBe(kind === "csrf" ? 403 : 200)
    if (kind !== "csrf") expect(await response.json()).toEqual(accepted)
    expect(mocks.limit).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })
})
