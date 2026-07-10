import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  verifyToken: vi.fn(),
  storageVersion: vi.fn(),
  getCertificateById: vi.fn(),
  getCertificateForIntake: vi.fn(),
  logCertificateEvent: vi.fn(),
  download: vi.fn(),
}))

vi.mock("@/lib/crypto/employer-certificate-token", () => ({
  verifyEmployerCertificateToken: mocks.verifyToken,
  getEmployerCertificateStorageVersion: mocks.storageVersion,
}))

vi.mock("@/lib/data/issued-certificates", () => ({
  getCertificateById: mocks.getCertificateById,
  getCertificateForIntake: mocks.getCertificateForIntake,
  logCertificateEvent: mocks.logCertificateEvent,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    storage: {
      from: () => ({ download: mocks.download }),
    },
  }),
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  }),
}))

import { GET } from "@/app/api/employer/certificates/[id]/download/route"

const CERTIFICATE_ID = "33333333-3333-4333-8333-333333333333"
const INTAKE_ID = "11111111-1111-4111-8111-111111111111"
const STORAGE_PATH = `certificates/corrections/${CERTIFICATE_ID}/version-2.pdf`

function request(token = "signed-token") {
  return new NextRequest(
    `https://instantmed.test/api/employer/certificates/${CERTIFICATE_ID}/download?token=${token}`,
    {
      headers: {
        "x-forwarded-for": "203.0.113.10",
        "user-agent": "vitest-employer",
      },
    },
  )
}

async function callRoute(token?: string) {
  return GET(request(token), { params: Promise.resolve({ id: CERTIFICATE_ID }) })
}

describe("employer certificate download route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifyToken.mockReturnValue({
      certificateId: CERTIFICATE_ID,
      storageVersion: "current-version",
    })
    mocks.storageVersion.mockReturnValue("current-version")
    const certificate = {
      id: CERTIFICATE_ID,
      intake_id: INTAKE_ID,
      status: "valid",
      storage_path: STORAGE_PATH,
      certificate_number: "IM-WORK-TEST",
    }
    mocks.getCertificateById.mockResolvedValue(certificate)
    mocks.getCertificateForIntake.mockResolvedValue(certificate)
    mocks.download.mockResolvedValue({
      data: new Blob(["%PDF"], { type: "application/pdf" }),
      error: null,
    })
    mocks.logCertificateEvent.mockResolvedValue({ success: true })
  })

  it("streams the current valid version without exposing a storage URL", async () => {
    const response = await callRoute()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("application/pdf")
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(mocks.download).toHaveBeenCalledWith(STORAGE_PATH)
    expect(mocks.logCertificateEvent).toHaveBeenCalledWith(
      CERTIFICATE_ID,
      "downloaded",
      null,
      "system",
      expect.objectContaining({ channel: "employer_version_bound_link" }),
      "203.0.113.10",
      "vitest-employer",
    )
  })

  it("invalidates an emailed token as soon as a correction switches storage version", async () => {
    mocks.verifyToken.mockReturnValueOnce({
      certificateId: CERTIFICATE_ID,
      storageVersion: "previous-version",
    })

    const response = await callRoute()

    expect(response.status).toBe(410)
    expect(mocks.download).not.toHaveBeenCalled()
  })

  it("rejects an invalid or non-current historical certificate", async () => {
    mocks.getCertificateForIntake.mockResolvedValueOnce({
      id: "new-current-certificate",
      intake_id: INTAKE_ID,
      status: "valid",
      storage_path: "certificates/new-current.pdf",
    })

    const response = await callRoute()

    expect(response.status).toBe(410)
    expect(mocks.download).not.toHaveBeenCalled()
  })

  it("fails closed when the employer access audit cannot be persisted", async () => {
    mocks.logCertificateEvent.mockResolvedValueOnce({ success: false, error: "audit unavailable" })

    const response = await callRoute()

    expect(response.status).toBe(503)
    expect(response.headers.get("retry-after")).toBe("30")
  })

  it("rejects a missing or invalid token before reading certificate data", async () => {
    mocks.verifyToken.mockReturnValueOnce(null)

    const response = await callRoute("invalid")

    expect(response.status).toBe(403)
    expect(mocks.getCertificateById).not.toHaveBeenCalled()
  })
})
