import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mocks.maybeSingle,
        }),
      }),
    }),
  }),
}))

describe("canSendMarketingEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("treats a missing preference row as default-on consent (operator decision 2026-07-17)", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const { canSendMarketingEmail } = await import("@/lib/email/preferences")

    await expect(canSendMarketingEmail("profile-1")).resolves.toBe(true)
  })

  it("fails closed when the preference read errors", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "db unavailable" } })
    const { canSendMarketingEmail } = await import("@/lib/email/preferences")

    await expect(canSendMarketingEmail("profile-1")).resolves.toBe(false)
  })

  it("allows marketing only when both explicit preference flags are enabled", async () => {
    const { canSendMarketingEmail } = await import("@/lib/email/preferences")

    mocks.maybeSingle.mockResolvedValueOnce({
      data: { marketing_emails: true, abandoned_checkout_emails: true },
      error: null,
    })
    await expect(canSendMarketingEmail("profile-1")).resolves.toBe(true)

    mocks.maybeSingle.mockResolvedValueOnce({
      data: { marketing_emails: false, abandoned_checkout_emails: true },
      error: null,
    })
    await expect(canSendMarketingEmail("profile-1")).resolves.toBe(false)
  })
})

describe("getMarketingEmailDecision", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("distinguishes default-on consent from an explicit policy opt-out", async () => {
    const { getMarketingEmailDecision } = await import("@/lib/email/preferences")

    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    await expect(getMarketingEmailDecision("profile-1")).resolves.toEqual({
      kind: "allowed",
    })

    mocks.maybeSingle.mockResolvedValueOnce({
      data: { marketing_emails: false, abandoned_checkout_emails: true },
      error: null,
    })
    await expect(getMarketingEmailDecision("profile-1")).resolves.toEqual({
      kind: "policy_suppressed",
    })
  })

  it("treats an unreadable preference as transiently blocked", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "db unavailable" },
    })
    const { getMarketingEmailDecision } = await import("@/lib/email/preferences")

    await expect(getMarketingEmailDecision("profile-1")).resolves.toEqual({
      kind: "transiently_blocked",
    })
  })
})
