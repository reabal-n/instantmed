import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migrationSource = readFileSync(
  join(process.cwd(), "supabase/migrations/20260501043000_retire_legacy_messages_table.sql"),
  "utf8",
)

describe("legacy public.messages retirement", () => {
  it("refuses to drop legacy message data without an explicit migration decision", () => {
    expect(migrationSource).toContain("SELECT count(*) FROM public.messages")
    expect(migrationSource).toContain("RAISE EXCEPTION")
    expect(migrationSource).toContain("legacy public.messages still contains")
  })

  it("removes the abandoned table and dependent legacy objects from the active schema", () => {
    expect(migrationSource).toContain("DROP VIEW IF EXISTS public.admin_queue")
    expect(migrationSource).toContain("DROP VIEW IF EXISTS public.patient_intakes_summary")
    expect(migrationSource).toContain("DROP FUNCTION IF EXISTS public.send_system_message")
    expect(migrationSource).toContain("DROP COLUMN IF EXISTS message_id")
    expect(migrationSource).toContain("DROP TABLE IF EXISTS public.messages")
    expect(migrationSource).toContain("DROP TYPE IF EXISTS public.message_sender_type")
  })
})
