import { describe, expect, it } from "vitest"

import { selectGuestProfileForAuthLink } from "@/lib/auth/guest-profile-linking"

describe("selectGuestProfileForAuthLink", () => {
  const candidates = [
    {
      id: "older-paid",
      auth_user_id: null,
      created_at: "2026-04-28T10:00:00.000Z",
      has_paid_intake: true,
    },
    {
      id: "newer-unpaid",
      auth_user_id: null,
      created_at: "2026-04-30T10:00:00.000Z",
      has_paid_intake: false,
    },
  ]

  it("links the paid checkout profile when the return intake identifies it", () => {
    expect(selectGuestProfileForAuthLink(candidates, "older-paid")?.id).toBe("older-paid")
  })

  it("prefers paid guest profiles over newer unpaid duplicates when intake context is absent", () => {
    expect(selectGuestProfileForAuthLink(candidates)?.id).toBe("older-paid")
  })

  it("ignores profiles that are already linked to an auth account", () => {
    expect(selectGuestProfileForAuthLink([
      {
        id: "already-linked",
        auth_user_id: "auth-user-id",
        created_at: "2026-04-30T10:00:00.000Z",
        has_paid_intake: true,
      },
      {
        id: "guest",
        auth_user_id: null,
        created_at: "2026-04-29T10:00:00.000Z",
        has_paid_intake: false,
      },
    ])?.id).toBe("guest")
  })
})
