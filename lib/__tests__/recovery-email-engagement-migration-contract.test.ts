import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260903120000_recovery_email_engagement.sql",
  ),
  "utf8",
).toLowerCase()

describe("recovery email engagement migration", () => {
  it("adds a non-PHI first-write-wins marker to durable intake payment truth", () => {
    expect(migration).toContain(
      "add column if not exists recovery_email_engaged_at timestamptz",
    )
    expect(migration).toContain("new.recovery_email_engaged_at := coalesce(")
    expect(migration).toContain("old.recovery_email_engaged_at")
    expect(migration).toContain("security invoker")
    expect(migration).toContain("set search_path = ''")
    expect(migration).toContain("from public, anon, authenticated")
    expect(migration).toContain("current_user not in ('postgres', 'service_role')")
    expect(migration).toContain("insufficient_privilege")
    expect(migration).toContain("before insert or update of recovery_email_engaged_at")
  })
})
