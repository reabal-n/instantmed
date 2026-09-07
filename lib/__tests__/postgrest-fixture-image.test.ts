import { execFile } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { promisify } from "node:util"

import { describe, expect, it } from "vitest"

const exec = promisify(execFile)
const digest = "sha256:54000f24847d01a2c2302e0041cf0618b875c57fb48507d743cfa9aaa50bf43c"
const primary = `public.ecr.aws/supabase/postgrest:v14.12@${digest}`
const mirror = `docker.io/postgrest/postgrest:v14.12@${digest}`
const script = resolve("scripts/prepare-postgrest-fixture-image.sh")
type Scenario = { cached?: string[]; pulls?: boolean[]; missingAfterPull?: boolean }
async function run(scenario: Scenario, target = script, args: string[] = []) {
  const cwd = await mkdtemp(join(tmpdir(), "postgrest-pull-"))
  try {
    const statePath = join(cwd, "state.json")
    await writeFile(statePath, JSON.stringify({ ...scenario, calls: [] }))
    await writeFile(join(cwd, "docker"), `#!/usr/bin/env node
const fs = require("node:fs")
const path = process.env.FIXTURE_STATE
const state = JSON.parse(fs.readFileSync(path, "utf8"))
const args = process.argv.slice(2)
state.calls.push(args)
let success = false
if (args[0] === "image" && args[1] === "inspect") success = (state.cached || []).includes(args[2])
if (args[0] === "pull") {
  success = (state.pulls || []).shift() || false
  if (success && !state.missingAfterPull) state.cached = [...(state.cached || []), args[1]]
}
fs.writeFileSync(path, JSON.stringify(state))
process.exit(success ? 0 : 1)
`, { mode: 0o755 })
    await writeFile(join(cwd, "sleep"), `#!/usr/bin/env node
const fs = require("node:fs")
const path = process.env.FIXTURE_STATE
const state = JSON.parse(fs.readFileSync(path, "utf8"))
state.calls.push(["sleep", ...process.argv.slice(2)])
fs.writeFileSync(path, JSON.stringify(state))
`, { mode: 0o755 })
    let stdout = "", stderr = "", exitCode = 0
    try {
      ({ stdout, stderr } = await exec("/bin/bash", [target, ...args], { cwd, timeout: 8000, env: { NODE_ENV: "test", PATH: `${cwd}:${dirname(process.execPath)}:/usr/bin:/bin`, FIXTURE_STATE: statePath } }))
    } catch (error) {
      const result = error as { stdout?: string; stderr?: string; code?: number }
      stdout = result.stdout || ""; stderr = result.stderr || ""; exitCode = result.code || 1
    }
    const state = JSON.parse(await readFile(statePath, "utf8")) as { calls: string[][] }
    return { stdout, stderr, exitCode, calls: state.calls, pulls: state.calls.filter(call => call[0] === "pull"), sleeps: state.calls.filter(call => call[0] === "sleep") }
  } finally { await rm(cwd, { recursive: true, force: true }) }
}

describe("pinned PostgREST fixture image retrieval", () => {
  it.each([primary, mirror])("reuses cached exact content without any pull: %s", async image => {
    const result = await run({ cached: [image] })
    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim()).toBe(image)
    expect(result.pulls).toEqual([])
    expect(result.sleeps).toEqual([])
  })
  it("returns primary after successful pull and local receipt", async () => {
    const result = await run({ pulls: [true] })
    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim()).toBe(primary)
    expect(result.pulls).toEqual([["pull", primary]])
    expect(result.calls.at(-1)).toEqual(["image", "inspect", primary])
  })
  it("retries primary once with bounded backoff", async () => {
    const result = await run({ pulls: [false, true] })
    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim()).toBe(primary)
    expect(result.pulls).toEqual([["pull", primary], ["pull", primary]])
    expect(result.sleeps).toEqual([["sleep", "5"]])
  })
  it("falls back only to the identical pinned official mirror", async () => {
    const result = await run({ pulls: [false, false, false, true] })
    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim()).toBe(mirror)
    expect(result.pulls).toEqual([["pull", primary], ["pull", primary], ["pull", mirror], ["pull", mirror]])
    expect(result.sleeps).toEqual([["sleep", "5"], ["sleep", "5"]])
  })
  it("exhausts both bounded sources with nonzero exit and no image output", async () => {
    const result = await run({ pulls: [false, false, false, false] })
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toBe("")
    expect(result.pulls).toHaveLength(4)
    expect(result.sleeps).toHaveLength(2)
  })
  it("rejects a successful pull without an exact local image receipt", async () => {
    const result = await run({ pulls: [true], missingAfterPull: true })
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toBe("")
    expect(result.pulls).toEqual([["pull", primary]])
  })
  it("refuses source or version overrides before invoking Docker", async () => {
    const result = await run({}, script, ["untrusted/image:latest"])
    expect(result.exitCode).toBe(1)
    expect(result.calls).toEqual([])
  })
  it.each(["checkout-restored-draft", "profile-encryption-backfill"])("stops the %s harness before container creation when retrieval fails", async fixture => {
    const result = await run({}, resolve(`scripts/test-${fixture}-db.sh`))
    expect(result.exitCode).not.toBe(0)
    expect(result.pulls).toHaveLength(4)
    expect(result.calls.some(call => call[0] === "run")).toBe(false)
  })
})
