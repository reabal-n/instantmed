import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260904160000_converge_runtime_schema_contracts.sql",
)
const SCHEMA_VALIDATION_PATH = join(
  process.cwd(),
  "lib/validation/schema-validation.ts",
)
const BACKEND_SMOKE_PATH = join(process.cwd(), "scripts/smoke-backend.ts")

function sourceWithoutComments(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/--.*$/gm, "")
    .trim()
    .toLowerCase()
}

describe("runtime schema convergence migration", () => {
  it("adds nullable runtime columns and a partial envelope-key index idempotently", () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true)
    if (!existsSync(MIGRATION_PATH)) return

    const sql = sourceWithoutComments(MIGRATION_PATH)

    expect(sql).toContain(
      "alter table public.intake_answers add column if not exists answers_encrypted jsonb",
    )
    expect(sql).toContain(
      "add column if not exists encryption_metadata jsonb",
    )
    expect(sql).toContain(
      "alter table public.patient_notes add column if not exists created_by_name text",
    )
    expect(sql).toContain("create index if not exists idx_intake_answers_encrypted_key")
    expect(sql).toContain("((answers_encrypted->>'keyid'))")
    expect(sql).toContain("where answers_encrypted is not null")
    expect(sql).toContain("comment on column public.intake_answers.answers_encrypted")
    expect(sql).toContain("comment on column public.intake_answers.encryption_metadata")
    expect(sql).toContain("comment on column public.patient_notes.created_by_name")
  })

  it("preserves legacy rows and ciphertext without a rewrite or stricter column shape", () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true)
    if (!existsSync(MIGRATION_PATH)) return

    const sql = sourceWithoutComments(MIGRATION_PATH)

    expect(sql).not.toMatch(/\bupdate\b/)
    expect(sql).not.toMatch(/\bdrop\b/)
    expect(sql).not.toMatch(/\brename\b/)
    expect(sql).not.toMatch(/add\s+column[^;]*\bnot\s+null\b/)
    expect(sql).not.toMatch(/add\s+column[^;]*\bdefault\b/)
    expect(sql).not.toMatch(/\banswers_enc\s*(?:=|::|\bto\b)/)
  })

  it("keeps runtime-critical columns in startup and read-only smoke probes", () => {
    const startup = readFileSync(SCHEMA_VALIDATION_PATH, "utf8")
    const smoke = readFileSync(BACKEND_SMOKE_PATH, "utf8")

    for (const source of [startup, smoke]) {
      const answersColumns =
        source.match(/intake_answers:\s*\[([\s\S]*?)\],/)?.[1] ?? ""
      expect(answersColumns).toContain('"answers_encrypted"')
      expect(answersColumns).toContain('"encryption_metadata"')

      const patientNotesColumns =
        source.match(/patient_notes:\s*\[([\s\S]*?)\],/)?.[1] ?? ""
      expect(patientNotesColumns).toContain('"created_by_name"')
    }
  })
})
