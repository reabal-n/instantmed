import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")
const ROTATION_BLOCKED = "PHI key rotation is not implemented"

describe("PHI key rotation documentation", () => {
  it("blocks rotation in every operator-facing runbook", () => {
    for (const path of [
      "docs/SECURITY.md",
      "docs/OPERATIONS.md",
      "docs/runbooks/BREAK_GLASS.md",
    ]) {
      expect(read(path), path).toContain(ROTATION_BLOCKED)
    }
  })

  it("does not present the plaintext backfill as a rotation tool", () => {
    expect(read("docs/SECURITY.md")).not.toContain(
      "Key rotation: generate new key, re-encrypt PHI fields via `scripts/encrypt-phi-backfill.ts`, update env var"
    )
    expect(read("docs/OPERATIONS.md")).not.toContain(
      "Use `scripts/encrypt-phi-backfill.ts` for re-encryption"
    )
    expect(read("docs/PHI_KEY_ROTATION_DESIGN.md")).not.toContain(
      "scripts/generate-phi-master-key.mjs"
    )
  })

  it("labels the script as initial backfill only", () => {
    const script = read("scripts/encrypt-phi-backfill.ts")
    expect(script).toContain("INITIAL BACKFILL ONLY — NOT KEY ROTATION")
    expect(script).toContain("This script uses ENCRYPTION_KEY")
  })

  it("warns admins that diagnostics cannot rotate keys", () => {
    const page = read("app/admin/settings/encryption/page.tsx")
    expect(page).toContain(ROTATION_BLOCKED)
    expect(page).not.toContain("checks for key rotation")
  })

  it("keeps the warning legible in dark mode", () => {
    const page = read("app/admin/settings/encryption/page.tsx")
    expect(page).toContain("dark:border-warning/30")
    expect(page).toContain("dark:bg-warning/10")
    expect(page).toContain("dark:text-warning")
  })
})
