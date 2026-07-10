import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  getEmployerCertificateDownloadHref,
  getEmployerCertificateStorageVersion,
  signEmployerCertificateToken,
  verifyEmployerCertificateToken,
} from "@/lib/crypto/employer-certificate-token"

const CERTIFICATE_ID = "33333333-3333-4333-8333-333333333333"
const STORAGE_PATH = "certificates/corrections/cert-1/version-1.pdf"

describe("employer certificate access token", () => {
  beforeEach(() => {
    vi.stubEnv("INTERNAL_API_SECRET", "test-employer-certificate-secret")
    vi.useRealTimers()
  })

  it("binds access to the certificate id and exact current storage version", () => {
    const token = signEmployerCertificateToken(CERTIFICATE_ID, STORAGE_PATH)

    expect(verifyEmployerCertificateToken(token)).toEqual({
      certificateId: CERTIFICATE_ID,
      storageVersion: getEmployerCertificateStorageVersion(STORAGE_PATH),
    })
    expect(getEmployerCertificateDownloadHref(CERTIFICATE_ID, STORAGE_PATH)).toMatch(
      new RegExp(`^/api/employer/certificates/${CERTIFICATE_ID}/download\\?token=`),
    )
  })

  it("rejects tampering and expires after seven days", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-10T00:00:00.000Z"))
    const token = signEmployerCertificateToken(CERTIFICATE_ID, STORAGE_PATH)

    expect(verifyEmployerCertificateToken(`${token}tampered`)).toBeNull()

    vi.setSystemTime(new Date("2026-07-17T00:00:00.001Z"))
    expect(verifyEmployerCertificateToken(token)).toBeNull()
  })

  it("changes the storage version when a correction switches object paths", () => {
    expect(getEmployerCertificateStorageVersion(STORAGE_PATH)).not.toBe(
      getEmployerCertificateStorageVersion(
        "certificates/corrections/cert-1/version-2.pdf",
      ),
    )
  })
})
