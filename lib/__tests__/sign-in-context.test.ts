import { describe, expect, it } from "vitest"

import { getSignInContext } from "@/lib/auth/sign-in-context"

describe("sign-in context", () => {
  it("explains payment recovery and promises the existing return path", () => {
    expect(
      getSignInContext(
        "/patient/intakes/11111111-1111-4111-8111-111111111111?retry=true&utm_campaign=abandoned_checkout",
      ),
    ).toEqual({
      description: "Your request is saved — we'll bring you straight back.",
      heading: "Sign in to finish payment",
      isPaymentRecovery: true,
      submitLabel: "Sign in to finish payment",
    })
  })

  it("keeps the normal welcome copy for unrelated destinations", () => {
    expect(getSignInContext("/patient")).toEqual({
      description: "Sign in to your account",
      heading: "Welcome back",
      isPaymentRecovery: false,
      submitLabel: "Sign in",
    })
  })
})
