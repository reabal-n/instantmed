import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  buildGuestProfileAuthLinkUpdate,
  selectGuestProfileForAuthLink,
} from "@/lib/auth/guest-profile-linking"

describe("guest profile auth linking", () => {
  it("selects the paid guest profile before newer unpaid duplicates", () => {
    const selected = selectGuestProfileForAuthLink(
      [
        {
          id: "new-unpaid",
          email: "patient@example.com",
          auth_user_id: null,
          has_paid_intake: false,
          created_at: "2026-05-01T10:00:00.000Z",
        },
        {
          id: "older-paid",
          email: "PATIENT@example.com",
          auth_user_id: null,
          has_paid_intake: true,
          created_at: "2026-05-01T09:00:00.000Z",
        },
      ],
      " patient@example.com ",
    )

    expect(selected?.id).toBe("older-paid")
  })

  it("falls back to the newest linkable guest profile when none have paid intakes", () => {
    const selected = selectGuestProfileForAuthLink(
      [
        {
          id: "older",
          email: "patient@example.com",
          auth_user_id: null,
          has_paid_intake: false,
          created_at: "2026-05-01T09:00:00.000Z",
        },
        {
          id: "newer",
          email: "patient@example.com",
          auth_user_id: null,
          has_paid_intake: false,
          created_at: "2026-05-01T10:00:00.000Z",
        },
      ],
      "patient@example.com",
    )

    expect(selected?.id).toBe("newer")
  })

  it("ignores already-linked or wrong-email profiles", () => {
    const selected = selectGuestProfileForAuthLink(
      [
        {
          id: "linked",
          email: "patient@example.com",
          auth_user_id: "existing-auth-user",
          has_paid_intake: true,
          created_at: "2026-05-01T10:00:00.000Z",
        },
        {
          id: "wrong-email",
          email: "other@example.com",
          auth_user_id: null,
          has_paid_intake: true,
          created_at: "2026-05-01T11:00:00.000Z",
        },
      ],
      "patient@example.com",
    )

    expect(selected).toBeNull()
  })

  it("preserves collected patient names when auth metadata only has an email-derived fallback", () => {
    const update = buildGuestProfileAuthLinkUpdate({
      profile: {
        id: "guest-profile",
        email: "patient@example.com",
        auth_user_id: null,
        full_name: "Marcus Pearson",
      },
      userId: "auth-user",
      primaryEmail: "patient@example.com",
      userMetadata: {},
      linkedAt: "2026-05-02T00:00:00.000Z",
    })

    expect(update).toMatchObject({
      auth_user_id: "auth-user",
      email: "patient@example.com",
      full_name: "Marcus Pearson",
      email_verified: true,
      email_verified_at: "2026-05-02T00:00:00.000Z",
    })
  })

  it("keeps the shared auth helper on the deterministic guest-linking path", () => {
    const authHelperSource = readFileSync(
      join(process.cwd(), "lib/auth/helpers.ts"),
      "utf8",
    )

    expect(authHelperSource).toContain("selectGuestProfileForAuthLink")
    expect(authHelperSource).toContain("buildGuestProfileAuthLinkUpdate")
    expect(authHelperSource).toContain('.eq("payment_status", "paid")')
    expect(authHelperSource).not.toContain('.is("auth_user_id", null)\n      .maybeSingle()')
  })
})
