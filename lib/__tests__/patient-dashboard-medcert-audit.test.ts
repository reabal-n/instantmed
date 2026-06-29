import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  getGuestCertificateAccessHref,
  getPatientCertificateDownloadHref,
  getPatientIntakeDetailHref,
} from "@/lib/patient/certificate-download"
import { resolveInitialPatientConversation } from "@/lib/patient/messages"

const readProjectFile = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

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

  it("routes guest certificate CTAs through certificate-ready account access", () => {
    const href = getGuestCertificateAccessHref("intake_123")

    expect(href).toBe("/auth/complete-account?intake_id=intake_123&access=certificate")
    expect(href).not.toContain("supabase.co/storage")
    expect(href).not.toContain("token=")
  })

  it("keeps public tracking approved-state access actionable and non-spinning", () => {
    const trackingClient = readProjectFile("app/track/[intakeId]/tracking-client.tsx")
    const trackingPage = readProjectFile("app/track/[intakeId]/page.tsx")

    expect(trackingClient).toContain('status: currentStep >= 4 ? "complete" : "upcoming"')
    expect(trackingClient).toContain('const canViewCertificate = intake.status === "approved" || intake.status === "completed"')
    expect(trackingClient).toContain("approvedAccessHref")
    expect(trackingClient).toContain("View certificate")
    expect(trackingPage).toContain("getGuestCertificateAccessHref(intake.id)")
    expect(trackingPage).toContain("buildPatientIntakeHref(intake.id)")
  })

  it("does not promise guests a raw emailed certificate attachment", () => {
    const completeAccount = readProjectFile("app/auth/complete-account/complete-account-form.tsx")
    const confirmed = readProjectFile("app/patient/intakes/confirmed/confirmed-client.tsx")

    expect(completeAccount).not.toContain("Your certificate will be emailed to you regardless")
    expect(confirmed).not.toContain("We'll email your certificate once it's ready")
    expect(completeAccount).toContain("Certificate downloads open through a secure account link")
    expect(completeAccount).toContain("Create Account & Track Request")
    expect(completeAccount).toContain("!certificateAccess && heardToken")
    expect(completeAccount).toContain("!certificateAccess && (")
    expect(confirmed).toContain("We'll email you when the doctor has finished.")
  })

  it("mirrors certificate email success onto the intake delivery timestamp", () => {
    const issuedCertificates = readProjectFile("lib/data/issued-certificates.ts")

    expect(issuedCertificates).toContain("document_sent_at")
    expect(issuedCertificates).toContain('generated_document_type: "medical_certificate"')
    expect(issuedCertificates).toContain('.is("document_sent_at", null)')
  })

  it("deep-links pending-info patients into the requested message thread", () => {
    expect(resolveInitialPatientConversation(["intake-a", "intake-b"], "intake-b")).toBe("intake-b")
  })

  it("falls back to the latest available conversation for invalid message deep links", () => {
    expect(resolveInitialPatientConversation(["intake-a"], "missing")).toBe("intake-a")
    expect(resolveInitialPatientConversation([], "missing")).toBeNull()
  })
})
