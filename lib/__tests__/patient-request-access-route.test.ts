import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  getOptionalAuth: vi.fn(),
  verifyToken: vi.fn(),
}))

vi.mock("@/lib/auth/helpers", () => ({
  getOptionalAuth: mocks.getOptionalAuth,
}))

vi.mock("@/lib/crypto/patient-request-access-token", () => ({
  PATIENT_REQUEST_ACCESS_COOKIE: "instantmed_patient_request_access",
  PATIENT_REQUEST_ACCESS_MAX_AGE_SECONDS: 604800,
  verifyPatientRequestAccessToken: mocks.verifyToken,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

import { GET } from "@/app/track/[intakeId]/route"

const INTAKE_ID = "11111111-1111-4111-8111-111111111111"
const PATIENT_ID = "22222222-2222-4222-8222-222222222222"

function request() {
  return new NextRequest("http://localhost:3060/track/signed-request-access")
}

function params(intakeId = "signed-request-access") {
  return { params: Promise.resolve({ intakeId }) }
}

function mockOwnedIntake(found: boolean) {
  const query = {
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({
      data: found ? { id: INTAKE_ID } : null,
      error: null,
    })),
  }
  mocks.createServiceRoleClient.mockReturnValue({
    from: vi.fn(() => ({ select: vi.fn(() => query) })),
  })
}

describe("GET /track/[request-access-token]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getOptionalAuth.mockResolvedValue(null)
    mocks.verifyToken.mockReturnValue({ intakeId: INTAKE_ID })
  })

  it("stores a valid capability only in an HttpOnly path-scoped cookie and redirects cleanly", async () => {
    const response = await GET(request(), params())

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe("http://localhost:3060/track/request")
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0")
    expect(response.headers.get("referrer-policy")).toBe("no-referrer")
    expect(response.headers.get("set-cookie")).toContain(
      "instantmed_patient_request_access=signed-request-access",
    )
    expect(response.headers.get("set-cookie")).toContain("HttpOnly")
    expect(response.headers.get("set-cookie")).toContain("Path=/track")
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax")
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("fails an invalid anonymous capability closed on the clean surface", async () => {
    mocks.verifyToken.mockReturnValue(null)

    const response = await GET(request(), params("not-a-token"))

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe("http://localhost:3060/track/request")
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("preserves a legacy raw UUID only for the authenticated patient owner", async () => {
    mocks.verifyToken.mockReturnValue(null)
    mocks.getOptionalAuth.mockResolvedValue({
      profile: { id: PATIENT_ID, role: "patient" },
    })
    mockOwnedIntake(true)

    const response = await GET(request(), params(INTAKE_ID))

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe(
      `http://localhost:3060/patient/intakes/${INTAKE_ID}`,
    )
  })

  it("does not reveal whether a legacy UUID exists to the wrong owner", async () => {
    mocks.verifyToken.mockReturnValue(null)
    mocks.getOptionalAuth.mockResolvedValue({
      profile: { id: PATIENT_ID, role: "patient" },
    })
    mockOwnedIntake(false)

    const response = await GET(request(), params(INTAKE_ID))

    expect(response.headers.get("location")).toBe("http://localhost:3060/track/request")
  })
})
