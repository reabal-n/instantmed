import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

/**
 * /auth/complete-account is where guest checkouts land after paying, and the
 * only surface that tells them which inbox "we'll email you" points at. For a
 * relay address (Apple Hide My Email — the 2026-07-02 incident), the account
 * email box must carry the expectation-setting note so the promise isn't read
 * against the patient's "real" address.
 */

vi.mock("@/lib/supabase/auth-provider", () => ({
  useAuth: () => ({ isSignedIn: false, isLoaded: true }),
}))
vi.mock("@/components/providers/posthog-provider", () => ({
  usePostHog: () => null,
}))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))
vi.mock("@/components/ui/confetti", () => ({
  Confetti: () => null,
}))
vi.mock("@/components/patient/related-services-probe", () => ({
  RelatedServicesProbe: () => null,
}))
vi.mock("@/components/patient/heard-about-us-card", () => ({
  HeardAboutUsCard: () => null,
}))
vi.mock("@/lib/analytics/attribution", () => ({
  getAttribution: () => ({}),
}))
vi.mock("@/lib/analytics/conversion-tracking", () => ({
  trackPurchase: () => {},
}))
vi.mock("@/lib/analytics/browser-purchase-dedup", () => ({
  claimBrowserPurchaseCompleted: () => true,
  getBrowserPurchaseCompletedInsertId: () => "test-insert-id",
}))
vi.mock("@/lib/navigation/auth-handoff", () => ({
  buildPostSignInHref: () => "/patient",
}))

import { CompleteAccountForm } from "@/app/auth/complete-account/complete-account-form"

const baseProps = {
  intakeId: "00000000-0000-0000-0000-000000000000",
  amountCents: 2995,
  serviceSlug: "medical-certificate",
  serviceName: "Medical Certificate",
  isNewCustomer: true,
}

describe("CompleteAccountForm relay email note", () => {
  it("does not claim a certificate is currently valid before account ownership is checked", () => {
    const html = renderToStaticMarkup(
      <CompleteAccountForm {...baseProps} certificateAccess />,
    )

    expect(html).toContain("Secure certificate access")
    expect(html).toContain("Create Account &amp; View Request")
    expect(html).not.toContain("Your certificate is ready")
  })

  it("shows the Hide My Email note when the account email is an Apple relay", () => {
    const html = renderToStaticMarkup(
      <CompleteAccountForm {...baseProps} email="gambols_pixie.6p@icloud.com" />,
    )
    expect(html).toContain("gambols_pixie.6p@icloud.com")
    expect(html).toMatch(/Hide My Email/)
    expect(html).toMatch(/Apple ID/)
  })

  it("shows no relay note for an ordinary address", () => {
    const html = renderToStaticMarkup(
      <CompleteAccountForm {...baseProps} email="jane@gmail.com" />,
    )
    expect(html).toContain("jane@gmail.com")
    expect(html).not.toMatch(/Hide My Email/)
  })

  it("renders safely with no email prop", () => {
    const html = renderToStaticMarkup(<CompleteAccountForm {...baseProps} />)
    expect(html).not.toMatch(/Hide My Email/)
    expect(html).toMatch(/Payment successful/)
  })
})
