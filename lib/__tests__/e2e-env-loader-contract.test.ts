import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

describe("E2E env loader contract", () => {
  it("loads env from the active checkout and primary checkout for git worktrees", () => {
    const loader = read("e2e/load-env.ts")

    expect(loader).toContain("git rev-parse --git-common-dir")
    expect(loader).toContain("PLAYWRIGHT_ENV_FILE")
    expect(loader).toContain(".env.local")
    expect(read("playwright.config.ts")).toContain("loadE2EEnv()")
    expect(read("e2e/global-setup.ts")).toContain("loadE2EEnv(path.join(__dirname, \"..\"))")
    expect(read("e2e/global-teardown.ts")).toContain("loadE2EEnv(path.join(__dirname, \"..\"))")
    expect(read("e2e/helpers/db.ts")).toContain("loadE2EEnv(path.join(__dirname, \"..\", \"..\"))")
  })
})
