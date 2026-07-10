import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getCurrent: vi.fn(),
  hasHistory: vi.fn(),
  getLegacyCertificate: vi.fn(),
  getLegacyDocument: vi.fn(),
}))

vi.mock("@/lib/data/issued-certificates", () => ({
  getCertificateWithPdfUrl: mocks.getCurrent,
  hasIssuedCertificateHistory: mocks.hasHistory,
}))

vi.mock("@/lib/data/documents", () => ({
  getMedCertCertificateForIntake: mocks.getLegacyCertificate,
  getLatestDocumentForIntake: mocks.getLegacyDocument,
}))

import { getPatientCertificateDocumentForIntake } from "@/lib/patient/intake-certificate-document"

describe("patient intake certificate legacy fallback", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.getCurrent.mockResolvedValue(null)
    mocks.hasHistory.mockResolvedValue(false)
    mocks.getLegacyCertificate.mockResolvedValue(null)
    mocks.getLegacyDocument.mockResolvedValue(null)
  })

  it("returns the current valid canonical certificate first", async () => {
    const current = { id: "current-valid", pdf_url: "/api/patient/certificates/current-valid/download" }
    mocks.getCurrent.mockResolvedValueOnce(current)

    await expect(getPatientCertificateDocumentForIntake("intake-1")).resolves.toBe(current)
    expect(mocks.hasHistory).not.toHaveBeenCalled()
  })

  it("never resurrects a legacy PDF when invalid canonical history exists", async () => {
    mocks.hasHistory.mockResolvedValueOnce(true)
    mocks.getLegacyCertificate.mockResolvedValueOnce({ id: "revoked-legacy" })
    mocks.getLegacyDocument.mockResolvedValueOnce({ id: "stale-document" })

    await expect(getPatientCertificateDocumentForIntake("intake-1")).resolves.toBeNull()
    expect(mocks.getLegacyCertificate).not.toHaveBeenCalled()
    expect(mocks.getLegacyDocument).not.toHaveBeenCalled()
  })

  it("uses legacy documents only for intakes with no issued-certificate history", async () => {
    const legacy = { id: "genuine-legacy", pdf_url: "/legacy.pdf" }
    mocks.getLegacyCertificate.mockResolvedValueOnce(legacy)

    await expect(getPatientCertificateDocumentForIntake("intake-1")).resolves.toBe(legacy)
  })
})
