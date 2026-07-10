import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getApiAuth: vi.fn(),
  getCertificateById: vi.fn(),
  getCertificateForIntake: vi.fn(),
  getSecureDownloadUrl: vi.fn(),
  logCertificateEvent: vi.fn(),
  applyRateLimit: vi.fn(),
  certificateQueryResult: vi.fn(),
  createSignedUrl: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}))

vi.mock("@/lib/auth/helpers", () => ({
  getApiAuth: mocks.getApiAuth,
}))

vi.mock("@/lib/auth/staff-capabilities", () => ({
  hasAdminAccess: vi.fn(() => false),
  hasDoctorAccess: vi.fn(() => false),
}))

vi.mock("@/lib/data/issued-certificates", () => ({
  getCertificateById: mocks.getCertificateById,
  getCertificateForIntake: mocks.getCertificateForIntake,
  getSecureDownloadUrl: mocks.getSecureDownloadUrl,
  logCertificateEvent: mocks.logCertificateEvent,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}))

vi.mock("@/lib/rate-limit/redis", () => ({
  applyRateLimit: mocks.applyRateLimit,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      single: mocks.certificateQueryResult,
    }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)

    return {
      from: vi.fn(() => query),
      storage: {
        from: vi.fn(() => ({ createSignedUrl: mocks.createSignedUrl })),
      },
    }
  },
}))

import { GET as getSignedUrl } from "@/app/api/certificates/[id]/download/route"
import { GET as streamPatientCertificate } from "@/app/api/patient/certificates/[id]/download/route"

const CERTIFICATE_ID = "33333333-3333-4333-8333-333333333333"
const INTAKE_ID = "11111111-1111-4111-8111-111111111111"
const PATIENT_ID = "22222222-2222-4222-8222-222222222222"

const requestedCertificate = {
  id: CERTIFICATE_ID,
  intake_id: INTAKE_ID,
  patient_id: PATIENT_ID,
  doctor_id: "44444444-4444-4444-8444-444444444444",
  certificate_number: "IM-WORK-TEST",
  status: "valid",
  storage_path: `certificates/${CERTIFICATE_ID}.pdf`,
}

const newerCertificate = {
  ...requestedCertificate,
  id: "55555555-5555-4555-8555-555555555555",
  storage_path: "certificates/new-current.pdf",
}

function request(path: string) {
  return new NextRequest(`https://instantmed.test${path}`)
}

describe("ID-keyed certificate download currentness", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getApiAuth.mockResolvedValue({
      profile: { id: PATIENT_ID, role: "patient" },
    })
    mocks.applyRateLimit.mockResolvedValue(null)
    mocks.getCertificateById.mockResolvedValue(requestedCertificate)
    mocks.certificateQueryResult.mockResolvedValue({
      data: requestedCertificate,
      error: null,
    })
    mocks.getCertificateForIntake.mockResolvedValue(newerCertificate)
  })

  it("rejects a valid owned historical row before generating a signed URL", async () => {
    const response = await getSignedUrl(
      request(`/api/certificates/${CERTIFICATE_ID}/download`),
      { params: Promise.resolve({ id: CERTIFICATE_ID }) },
    )

    expect(response.status).toBe(410)
    await expect(response.json()).resolves.toEqual({
      error: "Certificate is no longer current",
    })
    expect(mocks.getCertificateForIntake).toHaveBeenCalledWith(INTAKE_ID)
    expect(mocks.getSecureDownloadUrl).not.toHaveBeenCalled()
    expect(mocks.logCertificateEvent).not.toHaveBeenCalled()
  })

  it("rejects a valid owned historical row before reading certificate storage", async () => {
    const response = await streamPatientCertificate(
      request(`/api/patient/certificates/${CERTIFICATE_ID}/download`),
      { params: Promise.resolve({ id: CERTIFICATE_ID }) },
    )

    expect(response.status).toBe(410)
    await expect(response.json()).resolves.toEqual({
      error: "Certificate is no longer current",
    })
    expect(mocks.getCertificateForIntake).toHaveBeenCalledWith(INTAKE_ID)
    expect(mocks.createSignedUrl).not.toHaveBeenCalled()
    expect(mocks.logCertificateEvent).not.toHaveBeenCalled()
  })
})
