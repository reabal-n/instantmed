import { execFile } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { createServer } from "node:http"
import { join } from "node:path"
import { promisify } from "node:util"

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
const execFileAsync = promisify(execFile)

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

  it("fails the backend smoke when encrypted intake-answer columns are missing", async () => {
    const server = createServer((request, response) => {
      const requestUrl = new URL(request.url || "/", `http://${request.headers.host}`)
      const isIntakeAnswersProbe =
        requestUrl.pathname === "/rest/v1/intake_answers" &&
        requestUrl.searchParams.get("select")?.includes("answers_encrypted")

      response.setHeader("Content-Type", "application/json")

      if (isIntakeAnswersProbe) {
        response.writeHead(400).end(JSON.stringify({
          code: "42703",
          details: null,
          hint: null,
          message: "column intake_answers.answers_encrypted does not exist",
        }))
        return
      }

      response.writeHead(200).end("[]")
    })

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") {
      server.close()
      throw new Error("Failed to start the test Supabase server")
    }

    try {
      await expect(execFileAsync(
        process.execPath,
        ["--import", "tsx", "scripts/smoke-backend.ts"],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${address.port}`,
            SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
            SUPABASE_URL: `http://127.0.0.1:${address.port}`,
          },
        },
      )).rejects.toMatchObject({
        code: 1,
        stdout: expect.stringContaining(
          "intake_answers.answers_encrypted does not exist",
        ),
      })
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve())
      })
    }
  }, 15_000)
})
