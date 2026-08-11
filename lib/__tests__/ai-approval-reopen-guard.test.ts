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

  it("still surfaces a recoverable error if the correction genuinely fails", () => {
    // Atomic since 2026-08-11: an infrastructure failure rolls the whole
    // transaction back, so the message truthfully says nothing changed — the
    // old "certificate revoked, but…" split state can no longer exist.
    expect(action).toContain(
      "The revocation could not be completed, so nothing was changed. Retry before leaving this case.",
    )
  })

  it("gates the destructive revoke path on the med-cert review capability", () => {
    expect(action).toContain('doctorHasCapability(profile, "review_med_certs")')
  })

  // Admin-only is the security fix of #439: the action takes a caller-supplied
  // intake id and looks it up with the service role, so any wider role list
  // lets a doctor revoke ANY patient's certificate, bypassing the per-doctor
  // patient-access boundary. Without this pin a refactor could silently widen
  // it back to ["doctor", "admin"] — nothing else fails when that happens.
  it("keeps the revoke action admin-only and fully transactional", () => {
    expect(action).toContain('roles: ["admin"]')
    expect(action).not.toContain('roles: ["doctor", "admin"]')
    // Shape enforcement (category, status, certificate state) moved INTO the
    // transactional RPC under FOR UPDATE locks — pinned by
    // auto-issued-revoke-transaction-contract.test.ts. The action must stay a
    // single RPC delegate, never a split of app-side writes.
    expect(action).toContain('.rpc("revoke_auto_issued_certificate"')
    expect(action).not.toContain('.from("intakes")')
  })

  // Removing the 24h attestation card deleted `revokeAIApproval`'s ONLY UI
  // caller, leaving the action reachable from tests alone. `IntakeActionButtons`
  // is no substitute: `canDecline` excludes `approved`, and it has no revoke, so
  // a delivered auto-issued certificate rendered zero decision actions. The
  // operator could see a wrong certificate in the day's list and had no way to
  // correct it — which is also the claim docs/CLINICAL.md makes ("Revocation
  // remains the standing correction path"). Keep a real UI caller wired.
  it("keeps a production UI caller for the revoke action", () => {
    const cockpit = readFileSync(
      join(process.cwd(), "components/doctor/review/intake-review-cockpit.tsx"),
      "utf8",
    )
    expect(cockpit).toContain("RevokeAutoIssuedCertificate")
    expect(cockpit).toContain("isRevocableAutoIssuedCertificate(intake)")

    const revokeUi = readFileSync(
      join(process.cwd(), "components/doctor/review/revoke-auto-issued-certificate.tsx"),
      "utf8",
    )
    expect(revokeUi).toContain('from "@/app/actions/revoke-ai-approval"')
  })

  it("offers revocation only for a delivered auto-issued medical certificate", () => {
    const revokeUi = readFileSync(
      join(process.cwd(), "components/doctor/review/revoke-auto-issued-certificate.tsx"),
      "utf8",
    )
    // Med certs terminate at `approved`; `completed` is a DB terminal state the
    // reopen could never leave, which would strand a revoked certificate.
    expect(revokeUi).toContain('intake.ai_approved === true')
    expect(revokeUi).toContain('intake.category === "medical_certificate"')
    expect(revokeUi).toContain('intake.status === "approved"')
    expect(revokeUi).not.toContain('"completed"')
  })

  // CLAUDE.md names cert-revoke as a TypedConfirmDialog action, and the
  // 2026-07-12 cleanup roadmap logged the old "reason + click" revoke as an
  // open audit finding: a second plain click trains muscle-memory, and a typed
  // token catches the wrong-tab mistake a reason box cannot. This revokes a
  // certificate the patient already holds, so keep both gates.
  it("gates revocation behind a typed REVOKE confirmation as well as a reason", () => {
    const revokeUi = readFileSync(
      join(process.cwd(), "components/doctor/review/revoke-auto-issued-certificate.tsx"),
      "utf8",
    )
    expect(revokeUi).toContain("TypedConfirmDialog")
    expect(revokeUi).toContain('requiredText="REVOKE"')
    expect(revokeUi).toContain("MIN_REASON_LENGTH = 5")
    // The destructive button must open the dialog, never fire the action directly.
    expect(revokeUi).toContain("onClick={() => setConfirmOpen(true)}")
    expect(revokeUi).toContain("onConfirm={handleRevoke}")
  })
})
