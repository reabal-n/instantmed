import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260814187000_classify_future_review_request_retries.sql",
)

function readMigration(): string {
  expect(existsSync(MIGRATION_PATH)).toBe(true)

  return readFileSync(MIGRATION_PATH, "utf8")
    .toLowerCase()
    .replace(/\s+/g, " ")
}

describe("future-scheduled review-request lifecycle migration", () => {
  it("classifies a pending or sending owner scheduled after the snapshot as awaiting the next run", () => {
    const migration = readMigration()

    expect(migration).toContain(
      "outbox.status in ('pending', 'sending') and outbox.scheduled_for > bounds.as_of",
    )
    expect(migration).toContain(
      "as has_future_scheduled_owner",
    )
    expect(migration).toContain(
      "when evidence.has_future_scheduled_owner then 'awaiting_next_run'",
    )

    const scheduledOwnerBranch = migration.indexOf(
      "when evidence.has_future_scheduled_owner then 'awaiting_next_run'",
    )
    const genericAwaitingBranch = migration.indexOf(
      "when not evidence.has_outbox_owner and cohort.eligibility_at > bounds.latest_scheduled_run_at then 'awaiting_next_run'",
    )

    expect(scheduledOwnerBranch).toBeGreaterThan(-1)
    expect(genericAwaitingBranch).toBeGreaterThan(scheduledOwnerBranch)
  })

  it("preserves exact lifecycle reconciliation and the service-role-only boundary", () => {
    const migration = readMigration()

    expect(migration).toContain(
      "create or replace function public.get_review_request_funnel",
    )
    expect(migration).toContain("count(classified.intake_id) as eligible")
    expect(migration).toContain(
      "count(*) filter ( where classified.lifecycle = 'awaiting_next_run' ) as awaiting_next_run",
    )
    expect(migration).toContain(
      "count(*) filter ( where classified.lifecycle = 'actionable_backlog' ) as actionable_backlog",
    )
    expect(migration).toContain("security invoker")
    expect(migration).toContain("set search_path = ''")
    expect(migration).toContain(
      "revoke execute on function public.get_review_request_funnel(timestamptz, timestamptz, uuid[]) from public, anon, authenticated",
    )
    expect(migration).toContain(
      "grant execute on function public.get_review_request_funnel(timestamptz, timestamptz, uuid[]) to service_role",
    )
  })
})
