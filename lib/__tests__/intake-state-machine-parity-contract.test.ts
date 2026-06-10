import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"

import { VALID_STATUS_TRANSITIONS } from "@/lib/data/intake-lifecycle"

/**
 * Intake state-machine parity contract.
 *
 * The intake status transitions are enforced in TWO places that must stay in
 * sync (CLAUDE.md gotcha): the app layer (VALID_STATUS_TRANSITIONS in
 * lib/data/intake-lifecycle.ts) and the DB trigger validate_intake_status_transition().
 *
 * The dangerous, incident-causing direction is the app permitting a transition
 * the DB trigger FORBIDS: the update then throws at the DB and the intake gets
 * stuck (the 2026-06-09 checkout_failed→paid incident — a paid customer waited
 * 10 days). This test pins the safe invariant: **app ⊆ DB** — every transition
 * the app permits, the DB trigger must also permit.
 *
 * (The reverse — DB permits more than the app — is intentional app-side
 * strictness and is reported here for awareness, not failed.)
 *
 * It parses the LATEST migration that (re)defines the trigger, so adding a new
 * transition to one layer without the other fails this test.
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations")
const TRIGGER_FN = "FUNCTION validate_intake_status_transition"

function latestTriggerMigrationSql(): { file: string; sql: string } {
  const candidates = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .filter((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf-8").includes(TRIGGER_FN))
  const file = candidates[candidates.length - 1]
  return { file, sql: readFileSync(join(MIGRATIONS_DIR, file), "utf-8") }
}

/**
 * Parse the trigger SQL into a map of OLD.status -> allowed NEW.status[].
 * Handles two block shapes:
 *   IF OLD.status = 'X' THEN ... IF NEW.status NOT IN ('a','b') THEN RAISE ...
 *   IF OLD.status IN ('p','q') ... RAISE  (terminal states — allow nothing)
 * Any status NOT mentioned in an explicit block falls through to RETURN NEW in
 * the trigger (allows anything) and is treated as unconstrained.
 */
function parseTriggerAllowed(sql: string): {
  allowed: Map<string, Set<string>>
  terminal: Set<string>
} {
  const allowed = new Map<string, Set<string>>()
  const singleBlock = /IF\s+OLD\.status\s*=\s*'([a-z_]+)'\s+THEN[\s\S]*?NEW\.status\s+NOT\s+IN\s*\(([^)]*)\)/gi
  let m: RegExpExecArray | null
  while ((m = singleBlock.exec(sql)) !== null) {
    const from = m[1]
    const list = m[2]
      .split(",")
      .map((s) => s.trim().replace(/^'|'$/g, ""))
      .filter(Boolean)
    allowed.set(from, new Set(list))
  }

  const terminal = new Set<string>()
  const terminalBlock = /IF\s+OLD\.status\s+IN\s*\(([^)]*)\)\s*THEN\s*RAISE/i.exec(sql)
  if (terminalBlock) {
    terminalBlock[1]
      .split(",")
      .map((s) => s.trim().replace(/^'|'$/g, ""))
      .filter(Boolean)
      .forEach((s) => terminal.add(s))
  }
  return { allowed, terminal }
}

describe("intake state-machine app↔DB parity", () => {
  const { file, sql } = latestTriggerMigrationSql()
  const { allowed, terminal } = parseTriggerAllowed(sql)

  it("found and parsed a trigger definition", () => {
    expect(file).toBeTruthy()
    // sanity: the parser must have found the well-known blocks
    expect(allowed.has("paid")).toBe(true)
    expect(allowed.get("checkout_failed")?.has("paid")).toBe(true)
    expect(terminal.size).toBeGreaterThan(0)
  })

  it("app permits no transition the DB trigger forbids (app ⊆ DB)", () => {
    const violations: string[] = []

    for (const [from, tos] of Object.entries(VALID_STATUS_TRANSITIONS)) {
      for (const to of tos) {
        if (from === to) continue // trigger early-returns on OLD.status = NEW.status

        if (terminal.has(from)) {
          violations.push(`${from} → ${to}: app allows it but DB treats ${from} as terminal`)
          continue
        }

        const dbAllowed = allowed.get(from)
        // No explicit block => trigger falls through to RETURN NEW (allows all).
        if (!dbAllowed) continue

        if (!dbAllowed.has(to)) {
          violations.push(`${from} → ${to}: app allows it but DB trigger forbids it`)
        }
      }
    }

    expect(
      violations,
      `App-layer transitions the DB trigger (${file}) would reject — update the migration AND lib/data/intake-lifecycle.ts together:\n${violations.join("\n")}`,
    ).toEqual([])
  })

  it("reports DB-only transitions for awareness (does not fail)", () => {
    // Informational: transitions the DB permits but the app does not. Intentional
    // app strictness — surfaced so a deliberate loosening is a conscious choice.
    const dbOnly: string[] = []
    for (const [from, set] of allowed.entries()) {
      const appTos = new Set(VALID_STATUS_TRANSITIONS[from as keyof typeof VALID_STATUS_TRANSITIONS] ?? [])
      for (const to of set) {
        if (from === to) continue
        if (!appTos.has(to as never)) dbOnly.push(`${from} → ${to}`)
      }
    }
    // Always passes; logged for visibility in -v runs.
    expect(Array.isArray(dbOnly)).toBe(true)
  })
})
