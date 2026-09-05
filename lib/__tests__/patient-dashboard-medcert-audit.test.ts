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
const INTAKE_ID = "11111111-1111-4111-8111-111111111111"

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
    const href = getGuestCertificateAccessHref(INTAKE_ID)
    const hrefWithEmail = getGuestCertificateAccessHref(INTAKE_ID, "patient@example.test")

    expect(href).toMatch(/^\/track\/[A-Za-z0-9_-]+$/)
    expect(hrefWithEmail).toMatch(/^\/track\/[A-Za-z0-9_-]+$/)
    expect(href).not.toContain("supabase.co/storage")
    expect(href).not.toContain("token=")
    expect(hrefWithEmail).not.toContain("email=")
    expect(hrefWithEmail).not.toContain("patient@example.test")
  })

  it("keeps public request access actionable without exposing the bearer to React", () => {
    const tokenExchange = readProjectFile("app/track/[intakeId]/route.ts")
    const trackingPage = readProjectFile("app/track/request/page.tsx")
    const accessButton = readProjectFile("components/track/request-access-sign-in.tsx")

    expect(tokenExchange).toContain("PATIENT_REQUEST_ACCESS_COOKIE")
    expect(tokenExchange).toContain('httpOnly: true')
    expect(tokenExchange).toContain('new URL("/track/request", APP_URL)')
    expect(trackingPage).toContain('case "approved"')
    expect(trackingPage).toContain("<RequestAccessSignIn />")
    expect(accessButton).toContain("Email me a secure access link")
    expect(accessButton).not.toContain("requestAccessToken")
    expect(trackingPage).toContain("buildPatientIntakeHref(intake.id)")
    expect(trackingPage).not.toContain("requestAccessToken")
  })

  it("does not promise guests a raw emailed certificate attachment", () => {
    const completeAccount = readProjectFile("app/auth/complete-account/complete-account-form.tsx")
    const confirmed = readProjectFile("components/request/guest-confirmation-card.tsx")

    expect(completeAccount).not.toContain("Your certificate will be emailed to you regardless")
    expect(completeAccount).not.toContain('params.set("email"')
    expect(completeAccount).not.toContain("&email=")
    expect(confirmed).not.toContain("We'll email your certificate once it's ready")
    expect(completeAccount).toContain("Email me a sign-in link")
    expect(completeAccount).toContain("Continue without an account")
    expect(completeAccount).toContain("router.replace(REQUEST_CONFIRMED_HREF)")
    expect(completeAccount).not.toContain('params.set("intake_id"')
    expect(completeAccount).not.toContain("certificateAccess")
    expect(completeAccount).toContain("heardToken &&")
    expect(readProjectFile("app/auth/complete-account/page.tsx")).toContain(
      'if (intakeId && paymentState === "paid")',
    )
    expect(confirmed).toContain("We&apos;ll email you when your request is finished.")
    expect(confirmed).not.toContain("Create account to track progress")
    const publicConfirmation = readProjectFile("app/request/confirmed/page.tsx")
    expect(publicConfirmation).not.toContain("createServiceRoleClient")
    expect(confirmed).not.toContain("capture(")
  })

  it("sanitizes PostHog pageview URLs before capture", () => {
    const posthogProvider = readProjectFile("components/providers/posthog-provider.tsx")

    expect(posthogProvider).toContain('import { sanitizeUrl } from "@/lib/observability/sanitize-phi"')
    expect(posthogProvider).toContain('$current_url: sanitizeUrl(url)')
    expect(posthogProvider).not.toContain("$current_url: url")
  })

  it("mirrors certificate email success onto the intake delivery timestamp", () => {
    const issuedCertificates = readProjectFile("lib/data/issued-certificates.ts")
    const migration = readProjectFile(
      "supabase/migrations/20260814110000_make_stuck_intakes_reportable.sql",
    )

    expect(issuedCertificates).toContain('"reconcile_certificate_email_status"')
    expect(issuedCertificates).not.toContain('.from("intakes")\n      .update({\n        document_sent_at')
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.reconcile_certificate_email_status")
    expect(migration).toContain("SET document_sent_at = COALESCE(i.document_sent_at, v_now)")
    expect(migration).toContain("generated_document_type = 'medical_certificate'")
  })

  it("deep-links pending-info patients into the requested message thread", () => {
    expect(resolveInitialPatientConversation(["intake-a", "intake-b"], "intake-b")).toBe("intake-b")
  })

  it("falls back to the latest available conversation for invalid message deep links", () => {
    expect(resolveInitialPatientConversation(["intake-a"], "missing")).toBe("intake-a")
    expect(resolveInitialPatientConversation([], "missing")).toBeNull()
  })
})
