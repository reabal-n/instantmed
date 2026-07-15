import { existsSync } from "node:fs"
import { join } from "node:path"

import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  resolveGuestCheckoutResume: vi.fn(),
  verifyCheckoutResumeToken: vi.fn(),
}))

vi.mock("@/lib/crypto/checkout-resume-token", () => ({
  verifyCheckoutResumeToken: mocks.verifyCheckoutResumeToken,
}))

vi.mock("@/lib/stripe/checkout/guest-resume", () => ({
  resolveGuestCheckoutResume: mocks.resolveGuestCheckoutResume,
}))

import { dynamic, GET, revalidate } from "@/app/resume/[token]/route"

function request(token: string) {
  return new NextRequest(`https://instantmed.test/resume/${token}`)
}

describe("signed checkout resume route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveGuestCheckoutResume.mockResolvedValue(
      "/checkout/cancelled?reason=payment_state_unresolved",
    )
  })

  it("runs signed resume mutation in a dynamic no-store Route Handler", async () => {
    mocks.verifyCheckoutResumeToken.mockReturnValue({ intakeId: "intake-1" })

    const response = await GET(request("valid-token"), {
      params: Promise.resolve({ token: "valid-token" }),
    })

    expect(dynamic).toBe("force-dynamic")
    expect(revalidate).toBe(0)
    expect(mocks.resolveGuestCheckoutResume).toHaveBeenCalledWith("intake-1")
    expect(response.headers.get("location")).toBe(
      "https://instantmed.test/checkout/cancelled?reason=payment_state_unresolved",
    )
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow")
    expect(existsSync(join(process.cwd(), "app/resume/[token]/page.tsx"))).toBe(false)
  })

  it("redirects an invalid or expired token without running resume mutation", async () => {
    mocks.verifyCheckoutResumeToken.mockReturnValue(null)

    const response = await GET(request("expired-token"), {
      params: Promise.resolve({ token: "expired-token" }),
    })

    expect(response.headers.get("location")).toBe(
      "https://instantmed.test/request?error=expired_link",
    )
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow")
    expect(mocks.resolveGuestCheckoutResume).not.toHaveBeenCalled()
  })

  it("preserves an external Stripe destination from the verified resolver", async () => {
    mocks.verifyCheckoutResumeToken.mockReturnValue({ intakeId: "intake-1" })
    mocks.resolveGuestCheckoutResume.mockResolvedValue(
      "https://checkout.stripe.test/pay/cs_current",
    )

    const response = await GET(request("valid-token"), {
      params: Promise.resolve({ token: "valid-token" }),
    })

    expect(response.headers.get("location")).toBe(
      "https://checkout.stripe.test/pay/cs_current",
    )
  })
})
