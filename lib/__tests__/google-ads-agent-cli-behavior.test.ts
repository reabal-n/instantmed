import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function runAdsAgent(...args: string[]) {
  return spawnSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["ads:agent", ...args],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        NO_COLOR: "1",
      },
    },
  )
}

describe("Google Ads Agent proposal CLI", () => {
  it("requires an exact source run and packet file before drafting", () => {
    const withoutRun = runAdsAgent("proposal:draft")
    expect(withoutRun.status).toBe(1)
    expect(withoutRun.stderr).toContain("Missing --run")

    const withoutPacket = runAdsAgent(
      "proposal:draft",
      "--run=00000000-0000-4000-8000-000000000000",
    )
    expect(withoutPacket.status).toBe(1)
    expect(withoutPacket.stderr).toContain("Missing --packet")
  })

  it("requires one exact validated proposal before sending to Telegram", () => {
    const result = runAdsAgent("proposal:send")
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("Missing --proposal")
  })

  it("rejects caller-supplied baseline state before any external write", () => {
    const directory = mkdtempSync(join(tmpdir(), "instantmed-ads-packet-"))
    const packetPath = join(directory, "packet.json")
    writeFileSync(packetPath, JSON.stringify({
      baselineHash: "a".repeat(64),
      mutationFamily: "schedule_replace",
      operations: [],
      rationale: {},
      rollbackPlan: {},
    }))

    try {
      const result = runAdsAgent(
        "proposal:draft",
        "--run=00000000-0000-4000-8000-000000000000",
        `--packet=${packetPath}`,
      )
      expect(result.status).toBe(1)
      expect(result.stderr).toContain(
        "Unexpected proposal packet field: baselineHash",
      )
      expect(result.stderr).not.toContain("Google Ads proposal drafting is not implemented")
    } finally {
      rmSync(directory, { force: true, recursive: true })
    }
  })
})
