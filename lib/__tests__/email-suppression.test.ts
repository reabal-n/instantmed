import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  queries: [] as Array<{
    table: string
    selected: string
    column: string
    values: string[]
  }>,
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
  suppressions?: {
    data: Array<{ email_lower: string }> | null
    error: { message: string } | null
  }
  profiles?: {
    data: Array<{ id: string; normalized_email: string | null }> | null
    error: { message: string } | null
  }
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
    select: (selected: string) => ({
      in: async (column: string, values: string[]) => {
        mocks.queries.push({ table, selected, column, values })
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
    mocks.queries.length = 0
  })

  it("normalizes addresses and distinguishes allowed from explicit suppression", async () => {
    configureLookup({
      suppressions: {
        data: [{ email_lower: "blocked@example.com" }],
        error: null,
      },
      profiles: {
        data: [{
          id: "profile-1",
          normalized_email: " opted-out@example.com ",
        }],
        error: null,
      },
      preferences: {
        data: [{
          profile_id: "profile-1",
          marketing_emails: false,
          abandoned_checkout_emails: true,
        }],
        error: null,
      },
    })
    const { getEmailSuppressionDecisions } = await import("@/lib/email/suppression")

    const decisions = await getEmailSuppressionDecisions([
      " Allowed@example.com ",
      "blocked@example.com",
      "Opted-Out@example.com",
    ])

    expect(
      mocks.queries.find((query) => query.table === "profiles"),
    ).toEqual({
      table: "profiles",
      selected: "id, normalized_email",
      column: "normalized_email",
      values: [
        "allowed@example.com",
        "blocked@example.com",
        "opted-out@example.com",
      ],
    })
    expect(decisions.get("allowed@example.com")).toEqual({ kind: "allowed" })
    expect(decisions.get("blocked@example.com")).toEqual({
      kind: "policy_suppressed",
    })
    expect(decisions.get("opted-out@example.com")).toEqual({
      kind: "policy_suppressed",
    })
  })

  it("keeps lookup failures transient while the boolean wrapper remains fail-closed", async () => {
    configureLookup({
      suppressions: {
        data: null,
        error: { message: "db unavailable" },
      },
    })
    const {
      getEmailSuppressionDecisions,
      getSuppressedEmails,
    } = await import("@/lib/email/suppression")

    const decisions = await getEmailSuppressionDecisions([
      "patient@example.com",
    ])
    expect(decisions.get("patient@example.com")).toEqual({
      kind: "transiently_blocked",
    })

    const suppressed = await getSuppressedEmails(["patient@example.com"])
    expect(suppressed).toEqual(new Set(["patient@example.com"]))
  })

  it("preserves confirmed suppression when a later lookup fails", async () => {
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
