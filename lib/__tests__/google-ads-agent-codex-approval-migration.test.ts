import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260817095854_allow_direct_codex_ads_approval.sql",
  ),
  "utf8",
)

describe("direct Codex Google Ads approval migration", () => {
  it("allows only the validated Codex decision shortcuts", () => {
    expect(migration).toContain("old.status = 'validated'")
    expect(migration).toContain("'awaiting_approval',")
    expect(migration).toContain("'approved',")
    expect(migration).toContain("'rejected',")
    expect(migration).toContain(
      "old.status = 'awaiting_approval'\n      and new.status in ('approved', 'rejected', 'expired')",
    )
  })

  it("preserves immutable payload and receipt guards", () => {
    expect(migration).toContain("validated Google Ads proposal payload is immutable")
    expect(migration).toContain("Google Ads proposal validation receipt is immutable")
    expect(migration).toContain("Google Ads proposal decision receipt is immutable")
    expect(migration).toContain("Google Ads proposal apply receipt is immutable")
    expect(migration).toContain("Google Ads proposal verification receipt is immutable")
  })

  it("keeps a fixed search path and browser roles unable to execute it", () => {
    expect(migration).toContain("set search_path = ''")
    expect(migration).toContain(
      "revoke all on function public.enforce_google_ads_proposal_immutability()\n  from public, anon, authenticated;",
    )
    expect(migration.toLowerCase()).not.toContain("security definer")
  })
})
