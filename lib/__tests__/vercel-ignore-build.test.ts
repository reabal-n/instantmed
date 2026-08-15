import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

const SCRIPT_PATH = path.join(process.cwd(), "scripts/vercel-ignore-build.sh")
const temporaryRepos: string[] = []

function git(repo: string, ...args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: repo,
    encoding: "utf8",
  })
  if (result.status !== 0) {
    throw new Error(result.stderr || `git ${args.join(" ")} failed`)
  }
  return result.stdout.trim()
}

function createRepo(): string {
  const repo = mkdtempSync(path.join(tmpdir(), "instantmed-vercel-ignore-"))
  temporaryRepos.push(repo)
  git(repo, "init", "--quiet")
  git(repo, "config", "user.email", "ci@example.com")
  git(repo, "config", "user.name", "CI")
  mkdirSync(path.join(repo, "app"), { recursive: true })
  writeFileSync(path.join(repo, "app/runtime.ts"), "export const version = 1\n")
  git(repo, "add", "app/runtime.ts")
  git(repo, "commit", "--quiet", "-m", "initial runtime")
  return repo
}

function createShallowClone(source: string): string {
  const clone = mkdtempSync(path.join(tmpdir(), "instantmed-vercel-shallow-"))
  rmSync(clone, { recursive: true })
  const result = spawnSync(
    "git",
    ["clone", "--quiet", "--depth=1", `file://${source}`, clone],
    { encoding: "utf8" },
  )
  if (result.status !== 0) {
    throw new Error(result.stderr || "shallow clone failed")
  }
  temporaryRepos.push(clone)
  return clone
}

function commitFile(repo: string, file: string, contents: string, message: string): string {
  const target = path.join(repo, file)
  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, contents)
  git(repo, "add", file)
  git(repo, "commit", "--quiet", "-m", message)
  return git(repo, "rev-parse", "HEAD")
}

function runIgnoreStep(repo: string, previousSha: string | undefined) {
  return spawnSync("bash", [SCRIPT_PATH], {
    cwd: repo,
    encoding: "utf8",
    env: {
      ...process.env,
      VERCEL_GIT_COMMIT_MESSAGE: "docs: final receipt",
      VERCEL_GIT_COMMIT_REF: "main",
      VERCEL_GIT_PREVIOUS_SHA: previousSha ?? "",
    },
  })
}

afterEach(() => {
  for (const repo of temporaryRepos.splice(0)) {
    rmSync(repo, { force: true, recursive: true })
  }
})

describe("Vercel ignored build step", () => {
  it("builds when an earlier commit in a batched push changes runtime code", () => {
    const repo = createRepo()
    const deployedSha = git(repo, "rev-parse", "HEAD")
    commitFile(repo, "app/runtime.ts", "export const version = 2\n", "runtime change")
    commitFile(repo, "docs/receipt.md", "production receipt\n", "docs tail")

    const result = runIgnoreStep(repo, deployedSha)

    expect(result.status).toBe(1)
    expect(result.stdout).toContain("production branch with runtime changes")
  })

  it("skips only when the whole range since deployment is non-runtime", () => {
    const repo = createRepo()
    const deployedSha = git(repo, "rev-parse", "HEAD")
    commitFile(repo, "docs/one.md", "one\n", "docs one")
    commitFile(repo, "docs/two.md", "two\n", "docs two")

    const result = runIgnoreStep(repo, deployedSha)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("since the last successful deployment")
  })

  it("fetches the deployed commit when Vercel's shallow clone omits it", () => {
    const source = createRepo()
    const deployedSha = git(source, "rev-parse", "HEAD")
    commitFile(source, "app/runtime.ts", "export const version = 2\n", "runtime change")
    commitFile(source, "docs/receipt.md", "production receipt\n", "docs tail")
    const clone = createShallowClone(source)

    const missingBeforeFetch = spawnSync(
      "git",
      ["cat-file", "-e", `${deployedSha}^{commit}`],
      { cwd: clone },
    )
    expect(missingBeforeFetch.status).not.toBe(0)

    const result = runIgnoreStep(clone, deployedSha)

    expect(result.status).toBe(1)
    expect(result.stdout).toContain("production branch with runtime changes")
  })

  it("builds when runtime code is renamed into an ignored path", () => {
    const repo = createRepo()
    const deployedSha = git(repo, "rev-parse", "HEAD")
    mkdirSync(path.join(repo, "docs"), { recursive: true })
    git(repo, "mv", "app/runtime.ts", "docs/runtime.md")
    git(repo, "commit", "--quiet", "-m", "move runtime file")

    const result = runIgnoreStep(repo, deployedSha)

    expect(result.status).toBe(1)
    expect(result.stdout).toContain("production branch with runtime changes")
  })

  it("fails safe to a build without a readable deployed SHA", () => {
    const repo = createRepo()
    commitFile(repo, "docs/receipt.md", "production receipt\n", "docs tail")

    expect(runIgnoreStep(repo, undefined).status).toBe(1)
    expect(runIgnoreStep(repo, "not-a-sha").status).toBe(1)
  })
})
