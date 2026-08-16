import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8")
}

const agents = readProjectFile("AGENTS.md")
const claude = readProjectFile("CLAUDE.md")
const operations = readProjectFile("docs/OPERATIONS.md")
const releaseChecklist = readProjectFile("docs/PRODUCTION_RELEASE_CHECKLIST.md")
const testing = readProjectFile("docs/TESTING.md")
const vercelIgnoreBuild = readProjectFile("scripts/vercel-ignore-build.sh")
const mainProtectionChecker = readProjectFile("scripts/check-main-protection.mjs")

describe("main branch governance documentation contract", () => {
  it("makes PR-first delivery the universal main-branch rule", () => {
    for (const source of [agents, claude]) {
      expect(source).toMatch(/all changes to `main` must go through a pull request/i)
      expect(source).toContain("`main-pr-first`")
      expect(source).toMatch(/zero required approvals/i)
      expect(source).toMatch(/strict[^\n]*`build`[^\n]*`e2e`/i)
      expect(source).toMatch(/PR-only bypass/i)
      expect(source).not.toContain("Direct-to-main is emergency-only")
      expect(source).not.toContain("A true emergency push")
    }
  })

  it("documents the declarative ruleset, local guard, and safe activation order", () => {
    expect(operations).toContain("`.github/rulesets/main-pr-first.json`")
    expect(operations).toContain("`scripts/hooks/pre-push`")
    expect(operations).toMatch(
      /activate the `main-pr-first` ruleset before retiring classic branch protection/i,
    )
  })

  it("keeps release and CI guidance aligned on both required checks", () => {
    for (const source of [releaseChecklist, testing, vercelIgnoreBuild]) {
      expect(source).toMatch(/`build`[^\n]*`e2e`/i)
      expect(source).not.toMatch(/requires only (?:the )?`build`/i)
    }

    expect(releaseChecklist).toContain("`pnpm check:main-protection`")
    expect(releaseChecklist).toMatch(/direct pushes to `main` are forbidden/i)
    expect(operations).not.toContain("git push origin main")
  })

  it("fails the live receipt when the repository default branch drifts", () => {
    expect(mainProtectionChecker).toContain("nameWithOwner,defaultBranchRef")
    expect(mainProtectionChecker).toContain('defaultBranchRef?.name === "main"')
  })
})
