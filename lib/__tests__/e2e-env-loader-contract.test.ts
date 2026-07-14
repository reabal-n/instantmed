import { existsSync, readFileSync } from "node:fs"
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

  it("uses one canonical Playwright config with the local Next binary", () => {
    expect(existsSync(join(root, "playwright.intake.config.ts"))).toBe(false)

    const config = read("playwright.config.ts")

    expect(config).toContain("process.execPath")
    expect(config).toContain("node_modules/next/dist/bin/next")
    expect(config).toContain("${NODE_EXECUTABLE} ${NEXT_DEV_BIN} dev --port ${E2E_PORT}")
    expect(config).not.toContain("pnpm dev --port")
  })
})
