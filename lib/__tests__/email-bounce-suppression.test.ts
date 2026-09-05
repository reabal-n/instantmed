import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  profileResult: { data: null, error: null } as {
    data: Array<{
      id: string
      email_bounced: boolean
      email_delivery_failures: number | null
    }> | null
    error: { message: string } | null
  },
  preferenceResult: { data: null, error: null } as {
    data: Array<{
      profile_id: string
      marketing_emails: boolean
      abandoned_checkout_emails: boolean
      unsubscribe_reason: string | null
      preferences_changed_at?: string | null
      updated_at: string
    }> | null
    error: { message: string } | null
  },
  hardResult: { data: null, error: null } as {
    data: { id: string } | null
    error: { message: string } | null
  },
  softResult: { data: [], error: null } as {
    data: Array<{
      id: string
      delivery_status: string
      metadata: Record<string, unknown> | null
      sent_at: string | null
      created_at: string
    }> | null
    error: { message: string } | null
  },
  hardFilter: "",
  activeProfileFilters: [] as Array<{ column: string; value: unknown }>,
  addressPatterns: [] as string[],
  softQueries: 0,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => ({
      select: (columns: string) => {
        if (table === "profiles" || table === "email_preferences") {
          const chain = {
            eq: vi.fn(),
            in: vi.fn(),
            is: vi.fn(),
            limit: vi.fn(),
            maybeSingle: vi.fn(),
          }
          chain.eq.mockReturnValue(chain)
          chain.in.mockReturnValue(chain)
          chain.is.mockImplementation((column: string, value: unknown) => {
            if (table === "profiles") {
              mocks.activeProfileFilters.push({ column, value })
            }
            return chain
          })
          chain.limit.mockResolvedValue(
            table === "profiles" ? mocks.profileResult : mocks.preferenceResult,
          )
          return chain
        }

        if (columns.includes("delivery_status")) {
          mocks.softQueries += 1
          const chain = {
            ilike: vi.fn(),
            in: vi.fn(),
            gte: vi.fn(),
            limit: vi.fn(),
          }
          chain.ilike.mockImplementation((_column: string, pattern: string) => {
            mocks.addressPatterns.push(pattern)
            return chain
          })
          chain.in.mockReturnValue(chain)
          chain.gte.mockReturnValue(chain)
          chain.limit.mockResolvedValue(mocks.softResult)
          return chain
        }

        const chain = {
          ilike: vi.fn(),
          or: vi.fn(),
          limit: vi.fn(),
          maybeSingle: vi.fn(),
        }
        chain.ilike.mockImplementation((_column: string, pattern: string) => {
          mocks.addressPatterns.push(pattern)
          return chain
        })
        chain.or.mockImplementation((filter: string) => {
          mocks.hardFilter = filter
          return chain
        })
        chain.limit.mockReturnValue(chain)
        chain.maybeSingle.mockResolvedValue(mocks.hardResult)
        return chain
      },
    }),
  }),
}))

import {
  getEmailBounceSuppressionDecision,
  isEmailSuppressed,
} from "@/lib/email/utils"

describe("getEmailBounceSuppressionDecision", () => {
  beforeEach(() => {
    mocks.profileResult = { data: null, error: null }
    mocks.preferenceResult = { data: null, error: null }
    mocks.hardResult = { data: null, error: null }
    mocks.softResult = { data: [], error: null }
    mocks.hardFilter = ""
    mocks.activeProfileFilters = []
    mocks.addressPatterns = []
    mocks.softQueries = 0
  })

  it("treats a hard bounce or complaint as terminal policy suppression", async () => {
    mocks.hardResult = { data: { id: "outbox-1" }, error: null }

    await expect(
      getEmailBounceSuppressionDecision("patient@example.com"),
    ).resolves.toEqual({ kind: "policy_suppressed" })
  })

  it("uses ordered current-profile state so a newer success heals stale hard evidence", async () => {
    mocks.profileResult = {
      data: [{
        id: "patient-1",
        email_bounced: false,
        email_delivery_failures: 0,
      }],
      error: null,
    }
    // Historical evidence must not override the RPC's current attempt-order
    // mirror once a current-address profile exists.
    mocks.hardResult = { data: { id: "older-hard-bounce" }, error: null }
    mocks.softResult = {
      data: [
        {
          id: "old-soft-1",
          delivery_status: "bounced",
          metadata: { bounce_type: "soft" },
          sent_at: "2026-09-05T01:00:00Z",
          created_at: "2026-09-05T01:00:00Z",
        },
        {
          id: "old-soft-2",
          delivery_status: "bounced",
          metadata: { bounce_type: "soft" },
          sent_at: "2026-09-05T02:00:00Z",
          created_at: "2026-09-05T02:00:00Z",
        },
        {
          id: "old-soft-3",
          delivery_status: "bounced",
          metadata: { bounce_type: "soft" },
          sent_at: "2026-09-05T03:00:00Z",
          created_at: "2026-09-05T03:00:00Z",
        },
      ],
      error: null,
    }

    await expect(
      getEmailBounceSuppressionDecision(" Patient@Example.COM "),
    ).resolves.toEqual({ kind: "allowed" })
    expect(mocks.hardFilter).toBe("")
    expect(mocks.softQueries).toBe(0)
    expect(mocks.activeProfileFilters).toContainEqual({
      column: "merged_into_profile_id",
      value: null,
    })
  })

  it("uses the current profile consecutive-failure suffix for the soft threshold", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-05T12:00:00Z"))
    mocks.profileResult = {
      data: [{
        id: "patient-1",
        email_bounced: false,
        email_delivery_failures: 3,
      }],
      error: null,
    }
    mocks.softResult = {
      data: [1, 2, 3].map((hour) => ({
        id: `profile-soft-${hour}`,
        delivery_status: "bounced",
        metadata: { bounce_type: "soft" },
        sent_at: `2026-09-05T0${hour}:00:00Z`,
        created_at: `2026-09-05T0${hour}:00:00Z`,
      })),
      error: null,
    }

    await expect(
      getEmailBounceSuppressionDecision("patient@example.com"),
    ).resolves.toEqual({
      kind: "transiently_blocked",
      reason: "soft_bounce_threshold",
    })
    expect(mocks.softQueries).toBe(1)
    vi.useRealTimers()
  })

  it("allows a current profile again after the 24-hour soft-bounce window expires", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-06T12:00:00Z"))
    mocks.profileResult = {
      data: [{
        id: "patient-1",
        email_bounced: false,
        email_delivery_failures: 3,
      }],
      error: null,
    }
    // The database time filter has aged every prior bounce out.
    mocks.softResult = { data: [], error: null }

    await expect(
      getEmailBounceSuppressionDecision("patient@example.com"),
    ).resolves.toEqual({ kind: "allowed" })
    vi.useRealTimers()
  })

  it("blocks the latest hard or provider-suppressed current-address outcome", async () => {
    mocks.profileResult = {
      data: [{
        id: "patient-1",
        email_bounced: true,
        email_delivery_failures: 1,
      }],
      error: null,
    }

    await expect(
      getEmailBounceSuppressionDecision("patient@example.com"),
    ).resolves.toEqual({ kind: "policy_suppressed" })
  })

  it("keeps a valid spam complaint sticky after later delivery evidence", async () => {
    mocks.profileResult = {
      data: [{
        id: "patient-1",
        email_bounced: false,
        email_delivery_failures: 0,
      }],
      error: null,
    }
    mocks.preferenceResult = {
      data: [{
        profile_id: "patient-1",
        marketing_emails: false,
        abandoned_checkout_emails: false,
        unsubscribe_reason: "spam_complaint",
        updated_at: "2026-09-05T05:00:00Z",
      }],
      error: null,
    }

    await expect(
      getEmailBounceSuppressionDecision("patient@example.com"),
    ).resolves.toEqual({ kind: "policy_suppressed" })
  })

  it("aggregates conflicting active duplicate profiles for one address", async () => {
    mocks.profileResult = {
      data: [
        { id: "patient-clean", email_bounced: false, email_delivery_failures: 0 },
        { id: "patient-blocked", email_bounced: true, email_delivery_failures: 0 },
      ],
      error: null,
    }

    await expect(
      getEmailBounceSuppressionDecision("patient@example.com"),
    ).resolves.toEqual({ kind: "policy_suppressed" })
  })

  it.each([true, false])("only explicit re-enablement overrides a duplicate complaint: %s", async (explicit) => {
    mocks.profileResult = {
      data: [
        { id: "patient-a", email_bounced: false, email_delivery_failures: 0 },
        { id: "patient-b", email_bounced: false, email_delivery_failures: 0 },
      ],
      error: null,
    }
    mocks.preferenceResult = {
      data: [
        {
          profile_id: "patient-a",
          marketing_emails: false,
          abandoned_checkout_emails: false,
          unsubscribe_reason: "spam_complaint",
          updated_at: "2026-09-05T05:00:00Z",
        },
        {
          profile_id: "patient-b",
          marketing_emails: true,
          abandoned_checkout_emails: true,
          unsubscribe_reason: null,
          updated_at: "2026-09-05T06:00:00Z",
          preferences_changed_at: explicit ? "2026-09-05T06:00:00Z" : null,
        },
      ],
      error: null,
    }

    await expect(
      getEmailBounceSuppressionDecision("patient@example.com"),
    ).resolves.toEqual({ kind: explicit ? "allowed" : "policy_suppressed" })
  })

  it("keeps a newer duplicate-profile complaint sticky after older consent", async () => {
    mocks.profileResult = {
      data: [
        { id: "patient-a", email_bounced: false, email_delivery_failures: 0 },
        { id: "patient-b", email_bounced: false, email_delivery_failures: 0 },
      ],
      error: null,
    }
    mocks.preferenceResult = {
      data: [
        {
          profile_id: "patient-a",
          marketing_emails: true,
          abandoned_checkout_emails: true,
          unsubscribe_reason: null,
          updated_at: "2026-09-05T05:00:00Z",
        },
        {
          profile_id: "patient-b",
          marketing_emails: false,
          abandoned_checkout_emails: false,
          unsubscribe_reason: "spam_complaint",
          updated_at: "2026-09-05T06:00:00Z",
        },
      ],
      error: null,
    }

    await expect(
      getEmailBounceSuppressionDecision("patient@example.com"),
    ).resolves.toEqual({ kind: "policy_suppressed" })
  })

  it("recognizes normalized hard and legacy provider Permanent bounce metadata", async () => {
    await getEmailBounceSuppressionDecision("patient@example.com")

    expect(mocks.hardFilter).toContain("delivery_status.eq.suppressed")
    expect(mocks.hardFilter).toContain("metadata->>bounce_type.ilike.hard")
    expect(mocks.hardFilter).toContain("metadata->bounce->>type.ilike.hard")
    expect(mocks.hardFilter).toContain("metadata->bounce->>type.ilike.permanent")
  })

  it("keeps repeated soft bounces transient while preserving the boolean wrapper", async () => {
    mocks.softResult = {
      data: [1, 2, 3].map((hour) => ({
        id: `soft-${hour}`,
        delivery_status: "bounced",
        metadata: { bounce: { type: "Transient" } },
        sent_at: `2026-09-05T0${hour}:00:00Z`,
        created_at: `2026-09-05T0${hour}:00:00Z`,
      })),
      error: null,
    }

    await expect(
      getEmailBounceSuppressionDecision("patient@example.com"),
    ).resolves.toEqual({
      kind: "transiently_blocked",
      reason: "soft_bounce_threshold",
    })
    await expect(isEmailSuppressed("patient@example.com")).resolves.toBe(true)
  })

  it("resets the profile-less soft suffix after a newer successful attempt", async () => {
    mocks.softResult = {
      data: [
        ...[1, 2, 3].map((hour) => ({
          id: `soft-${hour}`,
          delivery_status: "bounced",
          metadata: { bounce_type: "soft" },
          sent_at: `2026-09-05T0${hour}:00:00Z`,
          created_at: `2026-09-05T0${hour}:00:00Z`,
        })),
        {
          id: "delivered-4",
          delivery_status: "delivered",
          metadata: null,
          sent_at: "2026-09-05T04:00:00Z",
          created_at: "2026-09-05T04:00:00Z",
        },
      ],
      error: null,
    }

    await expect(
      getEmailBounceSuppressionDecision("patient@example.com"),
    ).resolves.toEqual({ kind: "allowed" })
  })

  it("does not count hard metadata as a profile-less soft-bounce suffix", async () => {
    mocks.softResult = {
      data: [
        {
          id: "soft-3",
          delivery_status: "bounced",
          metadata: { bounce_type: "soft" },
          sent_at: "2026-09-05T03:00:00Z",
          created_at: "2026-09-05T03:00:00Z",
        },
        {
          id: "soft-2",
          delivery_status: "bounced",
          metadata: { bounce_type: "soft" },
          sent_at: "2026-09-05T02:00:00Z",
          created_at: "2026-09-05T02:00:00Z",
        },
        {
          id: "hard-1",
          delivery_status: "bounced",
          metadata: { bounce: { type: "Permanent" }, bounce_type: "soft" },
          sent_at: "2026-09-05T01:00:00Z",
          created_at: "2026-09-05T01:00:00Z",
        },
      ],
      error: null,
    }

    await expect(
      getEmailBounceSuppressionDecision("patient@example.com"),
    ).resolves.toEqual({ kind: "allowed" })
  })

  it("uses escaped case-insensitive exact patterns for profile-less recipients", async () => {
    await getEmailBounceSuppressionDecision(" Patient_%@Example.COM ")

    expect(mocks.addressPatterns).toEqual([
      "patient\\_\\%@example.com",
      "patient\\_\\%@example.com",
    ])
  })

  it.each(["hard", "soft"] as const)(
    "keeps a %s lookup failure retryable and fail-open for legacy callers",
    async (failedLookup) => {
      if (failedLookup === "hard") {
        mocks.hardResult = {
          data: null,
          error: { message: "db unavailable" },
        }
      } else {
        mocks.softResult = {
          data: null,
          error: { message: "db unavailable" },
        }
      }

      await expect(
        getEmailBounceSuppressionDecision("patient@example.com"),
      ).resolves.toEqual({
        kind: "transiently_blocked",
        reason: "lookup_failed",
      })
      await expect(isEmailSuppressed("patient@example.com")).resolves.toBe(false)
    },
  )
})
