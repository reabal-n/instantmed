import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  logger: {
    error: vi.fn(),
  },
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: mocks.from,
  }),
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
}))

function configureLookup(results: {
  suppressions?: { data: Array<{ email_lower: string }> | null; error: { message: string } | null }
  profiles?: { data: Array<{ id: string; email: string | null }> | null; error: { message: string } | null }
  preferences?: {
    data: Array<{
      profile_id: string
      marketing_emails: boolean
      abandoned_checkout_emails: boolean
    }> | null
    error: { message: string } | null
  }
}): void {
  mocks.from.mockImplementation((table: string) => ({
    select: () => ({
      in: async () => {
        if (table === "email_suppressions") {
          return results.suppressions ?? { data: [], error: null }
        }
        if (table === "profiles") {
          return results.profiles ?? { data: [], error: null }
        }
        return results.preferences ?? { data: [], error: null }
      },
    }),
  }))
}

describe("getEmailSuppressionDecisions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns allowed and definitive policy-suppressed decisions when lookups are available", async () => {
    configureLookup({
      suppressions: {
        data: [{ email_lower: "blocked@example.com" }],
        error: null,
      },
      profiles: {
        data: [{ id: "profile-1", email: "opted-out@example.com" }],
        error: null,
      },
      preferences: {
        data: [
          {
            profile_id: "profile-1",
            marketing_emails: false,
            abandoned_checkout_emails: true,
          },
        ],
        error: null,
      },
    })
    const { getEmailSuppressionDecisions } = await import("@/lib/email/suppression")

    const decisions = await getEmailSuppressionDecisions([
      " Allowed@example.com ",
      "blocked@example.com",
      "opted-out@example.com",
    ])

    expect(decisions.get("allowed@example.com")).toEqual({ kind: "allowed" })
    expect(decisions.get("blocked@example.com")).toEqual({
      kind: "policy_suppressed",
    })
    expect(decisions.get("opted-out@example.com")).toEqual({
      kind: "policy_suppressed",
    })
  })

  it("reports lookup failures as transient instead of definitive policy suppression", async () => {
    configureLookup({
      suppressions: {
        data: null,
        error: { message: "db unavailable" },
      },
    })
    const { getEmailSuppressionDecisions, getSuppressedEmails } = await import(
      "@/lib/email/suppression"
    )

    const decisions = await getEmailSuppressionDecisions([
      "patient@example.com",
    ])

    expect(decisions.get("patient@example.com")).toEqual({
      kind: "transiently_blocked",
    })
    await expect(getSuppressedEmails(["patient@example.com"])).resolves.toEqual(
      new Set(["patient@example.com"]),
    )
  })

  it("preserves confirmed suppression while marking unresolved addresses transient", async () => {
    configureLookup({
      suppressions: {
        data: [{ email_lower: "blocked@example.com" }],
        error: null,
      },
      profiles: {
        data: null,
        error: { message: "profiles unavailable" },
      },
    })
    const { getEmailSuppressionDecisions } = await import("@/lib/email/suppression")

    const decisions = await getEmailSuppressionDecisions([
      "blocked@example.com",
      "unknown@example.com",
    ])

    expect(decisions.get("blocked@example.com")).toEqual({
      kind: "policy_suppressed",
    })
    expect(decisions.get("unknown@example.com")).toEqual({
      kind: "transiently_blocked",
    })
  })
})
