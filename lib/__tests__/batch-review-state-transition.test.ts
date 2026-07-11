import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260711071506_allow_guarded_ai_med_cert_reopen.sql",
  ),
  "utf8",
)
const action = readFileSync(
  join(process.cwd(), "app/actions/revoke-ai-approval.ts"),
  "utf8",
)

describe("AI-approved medical certificate reopen guard", () => {
  it("allows approved to return to manual review only with a revocation and review receipt", () => {
    expect(migration).toContain("IF NEW.status = 'in_review' THEN")
    expect(migration).toContain("OLD.ai_approved IS NOT TRUE")
    expect(migration).toContain("NEW.batch_reviewed_at IS NULL")
    expect(migration).toContain("NEW.batch_reviewed_by IS NULL")
    expect(migration).toContain("certificate.status = 'revoked'")
  })

  it("fails the action when the intake cannot be reopened after revocation", () => {
    expect(action).toContain("Certificate revoked, but the intake could not return to manual review")
    expect(action).not.toContain("// Certificate is already revoked, so this is a partial failure")
  })
})
