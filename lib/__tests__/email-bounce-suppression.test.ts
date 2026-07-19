import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  hardResult: { data: null, error: null } as {
    data: { id: string } | null
    error: { message: string } | null
  },
  softResult: { count: 0, error: null } as {
    count: number | null
    error: { message: string } | null
  },
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: (_columns: string, options?: { head?: boolean }) => {
        if (options?.head) {
          const chain = {
            eq: vi.fn(),
            gte: vi.fn(),
          }
          chain.eq.mockReturnValue(chain)
          chain.gte.mockResolvedValue(mocks.softResult)
          return chain
        }

        const chain = {
          eq: vi.fn(),
          or: vi.fn(),
          limit: vi.fn(),
          maybeSingle: vi.fn(),
        }
        chain.eq.mockReturnValue(chain)
        chain.or.mockReturnValue(chain)
        chain.limit.mockReturnValue(chain)
        chain.maybeSingle.mockResolvedValue(mocks.hardResult)
        return chain
      },
    }),
  }),
}))

import { getEmailBounceSuppressionDecision } from "@/lib/email/utils"

describe("getEmailBounceSuppressionDecision", () => {
  beforeEach(() => {
    mocks.hardResult = { data: null, error: null }
    mocks.softResult = { count: 0, error: null }
  })

  it("treats a hard bounce or complaint as policy suppression", async () => {
    mocks.hardResult = { data: { id: "outbox-1" }, error: null }

    await expect(
      getEmailBounceSuppressionDecision("patient@example.com"),
    ).resolves.toEqual({ kind: "policy_suppressed" })
  })

  it("treats repeated soft bounces as a transient block", async () => {
    mocks.softResult = { count: 3, error: null }

    await expect(
      getEmailBounceSuppressionDecision("patient@example.com"),
    ).resolves.toEqual({ kind: "transiently_blocked" })
  })

  it.each(["hard", "soft"] as const)(
    "keeps a %s-bounce lookup failure retryable",
    async (failedLookup) => {
      if (failedLookup === "hard") {
        mocks.hardResult = { data: null, error: { message: "db unavailable" } }
      } else {
        mocks.softResult = { count: null, error: { message: "db unavailable" } }
      }

      await expect(
        getEmailBounceSuppressionDecision("patient@example.com"),
      ).resolves.toEqual({ kind: "transiently_blocked" })
    },
  )
})
