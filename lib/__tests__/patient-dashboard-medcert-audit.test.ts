import { describe, expect, it } from "vitest"

import {
  getPatientCertificateDownloadHref,
  getPatientIntakeDetailHref,
} from "@/lib/patient/certificate-download"
import { resolveInitialPatientConversation } from "@/lib/patient/messages"

describe("patient dashboard and certificate delivery contracts", () => {
  it("routes patient certificate downloads through the audited app endpoint", () => {
    const href = getPatientCertificateDownloadHref("cert_123")

    expect(href).toBe("/api/patient/certificates/cert_123/download")
    expect(href).not.toContain("supabase.co/storage")
    expect(href).not.toContain("token=")
  })

  it("routes certificate email CTAs to the authenticated patient intake page", () => {
    expect(getPatientIntakeDetailHref("intake_123")).toBe("/patient/intakes/intake_123")
    expect(getPatientIntakeDetailHref("intake 123")).toBe("/patient/intakes/intake%20123")
  })

  it("deep-links pending-info patients into the requested message thread", () => {
    expect(resolveInitialPatientConversation(["intake-a", "intake-b"], "intake-b")).toBe("intake-b")
  })

  it("falls back to the latest available conversation for invalid message deep links", () => {
    expect(resolveInitialPatientConversation(["intake-a"], "missing")).toBe("intake-a")
    expect(resolveInitialPatientConversation([], "missing")).toBeNull()
  })
})
