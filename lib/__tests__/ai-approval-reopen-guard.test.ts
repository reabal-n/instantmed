import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function latestTriggerMigrationSql(): string {
  const dir = join(process.cwd(), "supabase/migrations")
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
  for (const f of files.reverse()) {
    const sql = readFileSync(join(dir, f), "utf8")
    if (sql.includes("FUNCTION public.validate_intake_status_transition")) return sql
  }
  throw new Error("No migration defines validate_intake_status_transition")
}

const migration = latestTriggerMigrationSql()
const action = readFileSync(
  join(process.cwd(), "app/actions/revoke-ai-approval.ts"),
  "utf8",
)

function approvedBlock(sql: string): string {
  const start = sql.indexOf("OLD.status = 'approved'")
  const end = sql.indexOf("OLD.status = 'awaiting_script'")
  return sql.slice(start, end === -1 ? undefined : end)
}

describe("AI-approved medical certificate reopen guard", () => {
  it("permits approved -> in_review only when the issued certificate is revoked", () => {
    const block = approvedBlock(migration)
    expect(block).toContain("IF NEW.status = 'in_review' THEN")
    expect(block).toContain("certificate.status = 'revoked'")
  })

  it("does not require the batch-review receipt for the reopen", () => {
    // The guard was loosened from the batch-specific receipt to the true safety
    // invariant (a revoked cert). Requiring ai_approved + batch_reviewed_* broke
    // the 30s approval undo, which applies to MANUAL approvals (ai_approved=false)
    // and never stamps a batch receipt — the intake was stranded after the cert
    // was already revoked. The reopen branch must no longer gate on those.
    const block = approvedBlock(migration)
    expect(block).not.toContain("batch_reviewed_at IS NULL")
    expect(block).not.toContain("batch_reviewed_by IS NULL")
    expect(block).not.toContain("OLD.ai_approved IS NOT TRUE")
  })

  it("still surfaces a recoverable error if the reopen update genuinely fails", () => {
    expect(action).toContain("Certificate revoked, but the intake could not return to manual review")
  })

  it("gates the destructive revoke path on the med-cert review capability", () => {
    expect(action).toContain('doctorHasCapability(profile, "review_med_certs")')
  })
})
