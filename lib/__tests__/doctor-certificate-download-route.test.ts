import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GET } from "@/app/api/doctor/certificates/[intakeId]/download/route"
import { requireApiRole } from "@/lib/auth/helpers"
import { getCertificateForIntake, logCertificateEvent } from "@/lib/data/issued-certificates"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
  }),
}))

vi.mock("@/lib/rate-limit/redis", () => ({
  applyRateLimit: vi.fn(),
}))

vi.mock("@/lib/auth/helpers", () => ({
  requireApiRole: vi.fn(),
}))

vi.mock("@/lib/auth/staff-capabilities", () => ({
  hasAdminAccess: vi.fn((profile: { role?: string }) => profile.role === "admin"),
}))

vi.mock("@/lib/data/issued-certificates", () => ({
  getCertificateForIntake: vi.fn(),
  logCertificateEvent: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(),
}))

const intakeId = "11111111-1111-4111-8111-111111111111"
const certificate = {
  id: "cert-1",
  doctor_id: "doctor-owner",
  status: "valid",
  storage_path: "certificates/cert-1.pdf",
}

function makeRequest() {
  return new NextRequest(`https://instantmed.test/api/doctor/certificates/${intakeId}/download`, {
    headers: {
      "user-agent": "vitest",
      "x-forwarded-for": "203.0.113.10",
    },
  })
}

async function callRoute() {
  return GET(makeRequest(), { params: Promise.resolve({ intakeId }) })
}

describe("doctor certificate download route", () => {
  const createSignedUrl = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(applyRateLimit).mockResolvedValue(null)
    vi.mocked(getCertificateForIntake).mockResolvedValue(certificate as never)
    vi.mocked(logCertificateEvent).mockResolvedValue({ success: true })
    createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example/cert-1.pdf" },
      error: null,
    })
    vi.mocked(createServiceRoleClient).mockReturnValue({
      storage: {
        from: vi.fn(() => ({ createSignedUrl })),
      },
    } as never)
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), { status: 200 })),
    )
  })

  it("denies a doctor who did not issue the certificate before creating a service-role signed URL", async () => {
    vi.mocked(requireApiRole).mockResolvedValue({
      profile: { id: "other-doctor", role: "doctor" },
    } as never)

    const response = await callRoute()

    expect(response.status).toBe(403)
    expect(createServiceRoleClient).not.toHaveBeenCalled()
    expect(createSignedUrl).not.toHaveBeenCalled()
    expect(logCertificateEvent).not.toHaveBeenCalled()
  })

  it("allows the issuing doctor and records the PHI download audit event before returning the PDF", async () => {
    vi.mocked(requireApiRole).mockResolvedValue({
      profile: { id: "doctor-owner", role: "doctor" },
    } as never)

    const response = await callRoute()

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
    expect(createSignedUrl).toHaveBeenCalledWith(certificate.storage_path, 300)
    expect(logCertificateEvent).toHaveBeenCalledWith(
      certificate.id,
      "downloaded",
      "doctor-owner",
      "doctor",
      {
        channel: "doctor_certificate_download",
        intake_id: intakeId,
      },
      "203.0.113.10",
      "vitest",
    )
  })

  it("allows admin access for another doctor's certificate", async () => {
    vi.mocked(requireApiRole).mockResolvedValue({
      profile: { id: "admin-1", role: "admin" },
    } as never)

    const response = await callRoute()

    expect(response.status).toBe(200)
    expect(logCertificateEvent).toHaveBeenCalledWith(
      certificate.id,
      "downloaded",
      "admin-1",
      "admin",
      expect.any(Object),
      "203.0.113.10",
      "vitest",
    )
  })

  it("fails closed when the certificate download audit event cannot be written", async () => {
    vi.mocked(requireApiRole).mockResolvedValue({
      profile: { id: "doctor-owner", role: "doctor" },
    } as never)
    vi.mocked(logCertificateEvent).mockResolvedValue({ success: false, error: "audit table unavailable" })

    const response = await callRoute()

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: "Failed to audit certificate download" })
  })
})
