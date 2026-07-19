import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260719090000_communication_lifecycle_truth.sql",
  ),
  "utf8",
)
  .toLowerCase()
  .replace(/\s+/g, " ")

describe("communication lifecycle migration", () => {
  it("repairs recovery tracking IDs before enforcing uniqueness", () => {
    const addColumn = "add column if not exists recovery_tracking_id uuid;"
    const backfill =
      "update public.partial_intakes set recovery_tracking_id = gen_random_uuid() where recovery_tracking_id is null;"
    const setDefault = "alter column recovery_tracking_id set default gen_random_uuid();"
    const setNotNull = "alter column recovery_tracking_id set not null;"
    const uniqueIndex =
      "create unique index if not exists idx_partial_intakes_recovery_tracking_id on public.partial_intakes (recovery_tracking_id);"

    expect(migration).toContain(addColumn)
    expect(migration).toContain(backfill)
    expect(migration).toContain(setDefault)
    expect(migration).toContain(setNotNull)
    expect(migration).toContain(uniqueIndex)

    expect(migration.indexOf(addColumn)).toBeLessThan(
      migration.indexOf(backfill),
    )
    expect(migration.indexOf(backfill)).toBeLessThan(
      migration.indexOf(setDefault),
    )
    expect(migration.indexOf(setDefault)).toBeLessThan(
      migration.indexOf(setNotNull),
    )
    expect(migration.indexOf(setNotNull)).toBeLessThan(
      migration.indexOf(uniqueIndex),
    )
  })

  it("keeps sent proof separate from suppression markers", () => {
    expect(migration).toContain(
      "add column if not exists review_email_suppressed_at timestamptz",
    )
    expect(migration).toContain(
      "add column if not exists recovery_email_suppressed_at timestamptz",
    )
    expect(migration).not.toContain(
      "set review_email_suppressed_at = review_email_sent_at",
    )
    expect(migration).not.toContain(
      "set recovery_email_suppressed_at = recovery_email_sent_at",
    )
  })

  it("requires confirmed sent outbox proof for bounded reconciliation", () => {
    const functionStart = migration.indexOf(
      "create or replace function public.get_unmarked_sent_partial_recoveries",
    )
    const functionBody = migration.slice(functionStart)
    const sentProof = functionBody.indexOf("outbox.status = 'sent'")
    const unmarked = functionBody.indexOf(
      "partial.recovery_email_sent_at is null",
    )
    const limit = functionBody.indexOf(
      "limit greatest(1, least(coalesce(p_limit, 50), 50))",
    )

    expect(functionStart).toBeGreaterThan(-1)
    expect(sentProof).toBeGreaterThan(-1)
    expect(unmarked).toBeGreaterThan(-1)
    expect(limit).toBeGreaterThan(sentProof)
    expect(limit).toBeGreaterThan(unmarked)
    expect(functionBody).toContain(
      "revoke execute on function public.get_unmarked_sent_partial_recoveries(integer) from public, anon, authenticated",
    )
    expect(functionBody).toContain(
      "grant execute on function public.get_unmarked_sent_partial_recoveries(integer) to service_role",
    )
  })

  it("maps legacy recovery rows before creating tracking readers", () => {
    const compatibilityUpdate = migration.indexOf(
      "update public.email_outbox as outbox",
    )
    const activeRowAssertion = migration.indexOf(
      "active partial-intake recovery outbox rows could not be mapped to recovery_tracking_id",
    )
    const trackingIndex = migration.indexOf(
      "create index if not exists idx_email_outbox_partial_recovery_tracking",
    )
    const reconciliationFunction = migration.indexOf(
      "create or replace function public.get_unmarked_sent_partial_recoveries",
    )

    expect(compatibilityUpdate).toBeGreaterThan(-1)
    expect(migration).toContain(
      "extensions.digest(partial.session_id::text, 'sha256')",
    )
    expect(migration).toContain(
      "'recovery_tracking_id', partial.recovery_tracking_id::text",
    )
    expect(activeRowAssertion).toBeGreaterThan(compatibilityUpdate)
    expect(trackingIndex).toBeGreaterThan(activeRowAssertion)
    expect(reconciliationFunction).toBeGreaterThan(trackingIndex)
  })

  it("defers destructive legacy metadata cleanup", () => {
    expect(migration).toContain(
      "where email_type = 'partial_intake_recovery'",
    )
    for (const key of [
      "draft_idempotency_hash",
      "service_type",
      "draft_session_id",
      "session_id",
      "resume_url",
    ]) {
      expect(migration).not.toContain(`- '${key}'`)
    }
  })
})
