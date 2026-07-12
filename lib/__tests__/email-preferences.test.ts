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

  it("fails closed when no explicit preference row exists", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const { canSendMarketingEmail } = await import("@/lib/email/preferences")

    await expect(canSendMarketingEmail("profile-1")).resolves.toBe(false)
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
