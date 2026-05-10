import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function readRepoFile(filePath: string) {
  return readFileSync(path.join(root, filePath), "utf8")
}

describe("auth email operational visibility contract", () => {
  it("persists Supabase auth email send outcomes without raw recipient emails", () => {
    const webhook = readRepoFile("app/api/webhooks/supabase-auth/route.ts")
    const events = readRepoFile("lib/data/auth-email-events.ts")

    expect(webhook).toContain("recordAuthEmailEvent")
    expect(webhook).toContain('status: "sent"')
    expect(webhook).toContain('status: "failed"')
    expect(events).toContain("recipient_hash")
    expect(events).toContain("recipient_domain")
    expect(events).toContain('count: "exact", head: true')
    expect(events).not.toContain("recipient_email")
  })

  it("adds a service-role auth email events table scoped for ops health", () => {
    const migration = readRepoFile("supabase/migrations/20260504063000_auth_email_events.sql")

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.auth_email_events")
    expect(migration).toContain("recipient_hash")
    expect(migration).toContain("recipient_domain")
    expect(migration).toContain("auth_email_events_status_check")
    expect(migration).toContain("ALTER TABLE public.auth_email_events ENABLE ROW LEVEL SECURITY")
    expect(migration).not.toContain("recipient_email")
  })

  it("surfaces auth email failures in the admin ops dashboard", () => {
    const opsPage = readRepoFile("app/admin/ops/page.tsx")
    const opsClient = readRepoFile("app/admin/ops/ops-client.tsx")

    expect(opsPage).toContain("getAuthEmailHealth")
    expect(opsPage).toContain("authEmailsHealthy")
    expect(opsClient).toContain("Auth email")
    expect(opsClient).toContain("authEmailsHealthy")
    expect(opsClient).toContain("recentFailures: Array")
  })
})
