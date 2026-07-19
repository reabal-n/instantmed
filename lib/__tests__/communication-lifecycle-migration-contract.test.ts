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
  it("repairs recovery tracking IDs idempotently before enforcing uniqueness", () => {
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
    expect(migration).not.toContain(
      "recovery_tracking_id uuid not null default gen_random_uuid() unique",
    )

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
})
