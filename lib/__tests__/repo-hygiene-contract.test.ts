import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("repository hygiene contracts", () => {
  it("documents external AI worktrees to avoid nested Next lockfile warnings", () => {
    const rootDocs = [
      readFileSync(path.join(root, "AGENTS.md"), "utf8"),
      readFileSync(path.join(root, "CLAUDE.md"), "utf8"),
    ]

    for (const source of rootDocs) {
      expect(source).toContain("instantmed-worktrees")
      expect(source).toContain("outside the repository root")
    }
  })

  it("keeps auth handoff analytics opt-in until recurrence evidence exists", () => {
    const authHandoff = readFileSync(path.join(root, "lib/navigation/auth-handoff.ts"), "utf8")
    const agents = readFileSync(path.join(root, "AGENTS.md"), "utf8")

    expect(authHandoff).not.toMatch(/posthog|analytics\.capture|capture\(/i)
    expect(agents).toContain("auth-handoff analytics")
    expect(agents).toContain("recurs with evidence")
  })
})
