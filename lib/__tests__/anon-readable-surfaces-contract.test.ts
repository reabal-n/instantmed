import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const REPO_ROOT = join(__dirname, "..", "..")
const MIGRATIONS_DIR = join(REPO_ROOT, "supabase", "migrations")

// Guards the 2026-06-10 fix (migration 20260612000000_lockdown_anon_readable_surfaces.sql)
// that closed a live PHI leak: v_stuck_intakes was a SECURITY DEFINER view granting
// SELECT to the anon role, so the public anon key returned patient name + email over
// PostgREST. See docs/audits/2026-06-10-comprehensive-audit.md.
//
// These are static SQL-text checks — vitest runs in a Node env with no live DB — so they
// catch the dangerous PATTERNS being (re)introduced in a migration, not live grant drift.
// Live grant state is covered separately by the Supabase security advisor
// (security_definer_view lint).

const LOCKDOWN_MIGRATION = "20260612000000_lockdown_anon_readable_surfaces.sql"

function readMigration(name: string): string {
  return readFileSync(join(MIGRATIONS_DIR, name), "utf8")
}

function allMigrations(): { name: string; sql: string }[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readMigration(name) }))
}

describe("anon-readable surfaces contract", () => {
  it("the lockdown migration exists and revokes the leaked surfaces from anon", () => {
    const sql = readMigration(LOCKDOWN_MIGRATION).toLowerCase()
    expect(sql).toMatch(/revoke\s+all\s+on\s+public\.v_stuck_intakes\s+from\s+anon/)
    expect(sql).toMatch(/alter\s+view\s+public\.v_stuck_intakes\s+set\s+\(security_invoker\s*=\s*on\)/)
    expect(sql).toMatch(/revoke\s+all\s+on\s+public\.document_verifications\s+from\s+anon/)
  })

  it("no migration AFTER the lockdown grants SELECT/ALL on a public view (v_*) to anon or authenticated", () => {
    // CREATE VIEW does not grant anything by itself, but an explicit
    // `GRANT SELECT ON public.v_foo TO anon` re-opens the exact hole we just closed.
    // History (baseline + 20260502010500) created the v_stuck_intakes grant; those are
    // already-applied and neutralised by the lockdown migration's REVOKE, so we only
    // guard against REINTRODUCTION in newer migrations.
    const grantToAnonRe =
      /grant\s+(all|select)[\s\S]{0,80}?\bon\s+(table\s+)?public\.(v_[a-z0-9_]+|document_verifications|compliance_audit_summary)[\s\S]{0,40}?\bto\s+[^;]*\b(anon|authenticated)\b/i
    const offenders = allMigrations()
      .filter((m) => m.name > LOCKDOWN_MIGRATION)
      .filter((m) => grantToAnonRe.test(m.sql))
      .map((m) => m.name)
    expect(
      offenders,
      offenders.length
        ? `Migration(s) grant a public v_* view to anon/authenticated: ${offenders.join(", ")}. ` +
            `Views that surface PHI must be read server-side via the service role, not exposed to the anon key.`
        : "no offenders",
    ).toEqual([])
  })

  it("any view created/replaced after the lockdown sets security_invoker = on", () => {
    // A SECURITY DEFINER view in public runs as its owner and bypasses RLS on its base
    // tables — exactly how v_stuck_intakes leaked. New public views must be invoker-rights.
    const createViewRe = /create\s+(or\s+replace\s+)?view\s+(public\.)?([a-z0-9_]+)/gi
    const offenders: string[] = []
    for (const m of allMigrations()) {
      if (m.name < LOCKDOWN_MIGRATION) continue // don't retroactively fail history
      let match: RegExpExecArray | null
      const re = new RegExp(createViewRe)
      while ((match = re.exec(m.sql)) !== null) {
        const viewName = match[3]
        // Look at the statement body up to the next semicolon for a security_invoker setting.
        const start = match.index
        const end = m.sql.indexOf(";", start)
        const body = m.sql.slice(start, end === -1 ? undefined : end).toLowerCase()
        if (!body.includes("security_invoker")) {
          offenders.push(`${m.name}: view ${viewName}`)
        }
      }
    }
    expect(
      offenders,
      offenders.length
        ? `View(s) created without security_invoker: ${offenders.join("; ")}. ` +
            `Add WITH (security_invoker = on) so the view respects the caller's RLS.`
        : "no offenders",
    ).toEqual([])
  })

  it("every locked PHI surface is revoked from BOTH anon and authenticated", () => {
    // The original lockdown revoked compliance_audit_summary from anon ONLY, leaving the
    // authenticated grant (and the v_* regex above couldn't see a non-v_ view, so it slipped
    // through). Assert each named surface has a REVOKE from both roles across the migration
    // history — 20260623090952_revoke_compliance_audit_summary_authenticated.sql closed it.
    const PHI_SURFACES = ["v_stuck_intakes", "document_verifications", "compliance_audit_summary"]
    const allSql = allMigrations().map((m) => m.sql).join("\n").toLowerCase()
    const missing: string[] = []
    for (const surface of PHI_SURFACES) {
      for (const role of ["anon", "authenticated"]) {
        const re = new RegExp(
          `revoke\\s+(all|select)\\b[^;]*\\bon\\s+(table\\s+)?public\\.${surface}\\b[^;]*\\bfrom\\b[^;]*\\b${role}\\b`,
          "i",
        )
        if (!re.test(allSql)) missing.push(`${surface} -> ${role}`)
      }
    }
    expect(
      missing,
      missing.length ? `PHI surface(s) not revoked from a role: ${missing.join("; ")}` : "all revoked",
    ).toEqual([])
  })
})
