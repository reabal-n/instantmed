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
vi.mock("@/lib/navigation/auth-handoff", () => ({
  buildPostSignInHref: () => "/patient",
}))

import { CompleteAccountForm } from "@/app/auth/complete-account/complete-account-form"

const baseProps = {
  intakeId: "00000000-0000-0000-0000-000000000000",
  paymentState: "paid" as const,
}

describe("CompleteAccountForm relay email note", () => {
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

  it("shows a no-retry processing surface before an async payment is confirmed", () => {
    const html = renderToStaticMarkup(
      <CompleteAccountForm {...baseProps} paymentState="processing" />,
    )

    expect(html).toContain("Payment is still processing")
    expect(html).toContain("Please don\u2019t try payment again")
    expect(html).not.toContain("Payment successful")
    expect(html).not.toContain("Create Account &amp; Track Request")
  })

  it("does not claim success when payment cannot be confirmed", () => {
    const html = renderToStaticMarkup(
      <CompleteAccountForm {...baseProps} paymentState="unconfirmed" />,
    )

    expect(html).toContain("We can\u2019t confirm payment yet")
    expect(html).toContain("Please don\u2019t try payment again")
    expect(html).not.toContain("Payment successful")
  })
})
