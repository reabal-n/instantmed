import { spawnSync } from "node:child_process"
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

const hookPath = join(process.cwd(), "scripts/hooks/pre-push")
const temporaryDirectories: string[] = []

interface HookResult {
  output: string
  pnpmRan: boolean
  status: number | null
}

function runHook(input: string): HookResult {
  const fakeBin = mkdtempSync(join(tmpdir(), "instantmed-pre-push-"))
  temporaryDirectories.push(fakeBin)

  const sentinelPath = join(fakeBin, "pnpm-ran")
  const fakePnpmPath = join(fakeBin, "pnpm")
  writeFileSync(
    fakePnpmPath,
    '#!/usr/bin/env bash\n: > "$INSTANTMED_PRE_PUSH_PNPM_SENTINEL"\nexit 0\n',
  )
  chmodSync(fakePnpmPath, 0o755)

  const result = spawnSync("/bin/bash", [hookPath], {
    input,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${fakeBin}:/usr/bin:/bin`,
      INSTANTMED_PRE_PUSH_PNPM_SENTINEL: sentinelPath,
    },
  })

  return {
    output: `${result.stdout}${result.stderr}`,
    pnpmRan: existsSync(sentinelPath),
    status: result.status,
  }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe("PR-only pre-push guard", () => {
  it("allows feature branch pushes without running pnpm", () => {
    const result = runHook(
      "refs/heads/codex/refund-hardening 1111111111111111111111111111111111111111 refs/heads/codex/refund-hardening 0000000000000000000000000000000000000000\n",
    )

    expect(result.status).toBe(0)
    expect(result.pnpmRan).toBe(false)
  })

  it.each([
    {
      name: "a normal branch update",
      input:
        "refs/heads/main 1111111111111111111111111111111111111111 refs/heads/main 2222222222222222222222222222222222222222\n",
    },
    {
      name: "a differently named local branch",
      input:
        "refs/heads/release-candidate 1111111111111111111111111111111111111111 refs/heads/main 2222222222222222222222222222222222222222\n",
    },
    {
      name: "a branch deletion",
      input:
        "(delete) 0000000000000000000000000000000000000000 refs/heads/main 2222222222222222222222222222222222222222\n",
    },
    {
      name: "one main update among multiple refs",
      input:
        "refs/heads/topic 1111111111111111111111111111111111111111 refs/heads/topic 2222222222222222222222222222222222222222\nrefs/heads/another-topic 3333333333333333333333333333333333333333 refs/heads/main 4444444444444444444444444444444444444444\n",
    },
  ])("blocks $name with PR guidance and without running pnpm", ({ input }) => {
    const result = runHook(input)

    expect(result.status).not.toBe(0)
    expect(result.output).toMatch(/open a PR/i)
    expect(result.pnpmRan).toBe(false)
  })
})
