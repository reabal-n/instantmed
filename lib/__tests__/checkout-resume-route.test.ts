import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  resolveGuestCheckoutResume: vi.fn(),
  verifyCheckoutResumeToken: vi.fn(),
  verifyRecoveryEmailEngagementToken: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}))

vi.mock("@/lib/crypto/checkout-resume-token", () => ({
  verifyCheckoutResumeToken: mocks.verifyCheckoutResumeToken,
}))

vi.mock("@/lib/crypto/recovery-email-engagement-token", () => ({
  verifyRecoveryEmailEngagementToken: mocks.verifyRecoveryEmailEngagementToken,
}))

vi.mock("@/lib/stripe/checkout/guest-resume", () => ({
  resolveGuestCheckoutResume: mocks.resolveGuestCheckoutResume,
}))

import { continueGuestCheckoutResume } from "@/app/resume/[token]/actions"
import ResumeCheckoutPage, {
  dynamic,
  metadata,
  revalidate,
} from "@/app/resume/[token]/page"

const pageSource = readFileSync(
  join(process.cwd(), "app/resume/[token]/page.tsx"),
  "utf8",
)

describe("signed checkout resume interstitial", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.redirect.mockImplementation((destination: string) => {
      throw new Error(`NEXT_REDIRECT:${destination}`)
    })
    mocks.verifyRecoveryEmailEngagementToken.mockReturnValue(null)
    mocks.resolveGuestCheckoutResume.mockResolvedValue(
      "/checkout/cancelled?reason=payment_state_unresolved",
    )
  })

  it("keeps GET scanner-safe and waits for an explicit patient action", async () => {
    mocks.verifyCheckoutResumeToken.mockReturnValue({ intakeId: "intake-1" })

    const page = await ResumeCheckoutPage({
      params: Promise.resolve({ token: "valid-token" }),
      searchParams: Promise.resolve({ recovery_proof: "signed-recovery-proof" }),
    })

    expect(page).toBeTruthy()
    expect(dynamic).toBe("force-dynamic")
    expect(revalidate).toBe(0)
    expect(metadata.robots).toEqual({ index: false, follow: false })
    expect(metadata.referrer).toBe("no-referrer")
    expect(mocks.verifyCheckoutResumeToken).toHaveBeenCalledWith("valid-token")
    expect(mocks.verifyRecoveryEmailEngagementToken).not.toHaveBeenCalled()
    expect(mocks.resolveGuestCheckoutResume).not.toHaveBeenCalled()
    expect(pageSource).toContain("continueGuestCheckoutResume.bind")
    expect(pageSource).toContain("<form action={continueAction}")
    expect(pageSource).toContain("Continue to secure payment")
    expect(existsSync(join(process.cwd(), "app/resume/[token]/route.ts"))).toBe(false)
  })

  it("redirects an invalid or expired GET without running resume mutation", async () => {
    mocks.verifyCheckoutResumeToken.mockReturnValue(null)

    await expect(ResumeCheckoutPage({
      params: Promise.resolve({ token: "expired-token" }),
      searchParams: Promise.resolve({}),
    })).rejects.toThrow("NEXT_REDIRECT:/request?error=expired_link")

    expect(mocks.verifyRecoveryEmailEngagementToken).not.toHaveBeenCalled()
    expect(mocks.resolveGuestCheckoutResume).not.toHaveBeenCalled()
  })

  it("continues only after POST and passes server-verified recovery proof", async () => {
    mocks.verifyCheckoutResumeToken.mockReturnValue({ intakeId: "intake-1" })
    mocks.verifyRecoveryEmailEngagementToken.mockReturnValue({ intakeId: "intake-1" })
    mocks.resolveGuestCheckoutResume.mockResolvedValue(
      "https://checkout.stripe.test/pay/cs_current",
    )

    await expect(continueGuestCheckoutResume(
      "valid-token",
      "signed-recovery-proof",
    )).rejects.toThrow("NEXT_REDIRECT:https://checkout.stripe.test/pay/cs_current")

    expect(mocks.verifyCheckoutResumeToken).toHaveBeenCalledWith("valid-token")
    expect(mocks.verifyRecoveryEmailEngagementToken).toHaveBeenCalledWith(
      "signed-recovery-proof",
    )
    expect(mocks.resolveGuestCheckoutResume).toHaveBeenCalledWith("intake-1", true)
  })

  it("does not accept a recovery proof for a different intake", async () => {
    mocks.verifyCheckoutResumeToken.mockReturnValue({ intakeId: "intake-1" })
    mocks.verifyRecoveryEmailEngagementToken.mockReturnValue({ intakeId: "intake-2" })

    await expect(continueGuestCheckoutResume(
      "valid-token",
      "wrong-intake-proof",
    )).rejects.toThrow(
      "NEXT_REDIRECT:/checkout/cancelled?reason=payment_state_unresolved",
    )

    expect(mocks.resolveGuestCheckoutResume).toHaveBeenCalledWith("intake-1", false)
  })

  it("rejects an invalid POST token without resolving checkout", async () => {
    mocks.verifyCheckoutResumeToken.mockReturnValue(null)

    await expect(continueGuestCheckoutResume(
      "expired-token",
      null,
    )).rejects.toThrow("NEXT_REDIRECT:/request?error=expired_link")

    expect(mocks.verifyRecoveryEmailEngagementToken).not.toHaveBeenCalled()
    expect(mocks.resolveGuestCheckoutResume).not.toHaveBeenCalled()
  })
})
