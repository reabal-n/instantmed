import { mkdtempSync, rmSync } from "node:fs"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { updateIndex } from "../index-update"

let tmpRoot: string

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "review-index-"))
})

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true })
})

function writeRun(runId: string, frontmatter: Record<string, string>, headline: string): void {
  const dir = join(tmpRoot, runId)
  mkdirSync(dir, { recursive: true })
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")
  const body = `---\n${fm}\n---\n\n# ${headline}\n\nSome body content.`
  writeFileSync(join(dir, "report.md"), body, "utf8")
}

describe("updateIndex", () => {
  it("renders the empty placeholder when no runs exist", async () => {
    await updateIndex(tmpRoot)
    const out = readFileSync(join(tmpRoot, "INDEX.md"), "utf8")
    expect(out).toContain("_no runs yet_")
  })

  it("sorts runs newest-first by capturedAt", async () => {
    writeRun(
      "2026-05-23-paid-funnel-aaaa",
      {
        runId: "2026-05-23-paid-funnel-aaaa",
        journey: "Paid funnel",
        url: "https://example.com",
        overallScore: "7",
        capturedAt: "2026-05-23T10:00:00Z",
      },
      "Older run",
    )
    writeRun(
      "2026-05-25-homepage-bbbb",
      {
        runId: "2026-05-25-homepage-bbbb",
        journey: "Homepage",
        url: "https://example.com",
        overallScore: "8",
        capturedAt: "2026-05-25T10:00:00Z",
      },
      "Newer run",
    )

    await updateIndex(tmpRoot)
    const out = readFileSync(join(tmpRoot, "INDEX.md"), "utf8")
    const newerIdx = out.indexOf("Newer run")
    const olderIdx = out.indexOf("Older run")
    expect(newerIdx).toBeGreaterThan(-1)
    expect(olderIdx).toBeGreaterThan(-1)
    expect(newerIdx).toBeLessThan(olderIdx)
  })

  it("survives a run dir with no report.md", async () => {
    mkdirSync(join(tmpRoot, "2026-05-24-broken-cccc"), { recursive: true })
    writeRun(
      "2026-05-25-ok-dddd",
      {
        runId: "2026-05-25-ok-dddd",
        journey: "Homepage",
        url: "https://example.com",
        overallScore: "9",
        capturedAt: "2026-05-25T11:00:00Z",
      },
      "OK run",
    )

    await updateIndex(tmpRoot)
    const out = readFileSync(join(tmpRoot, "INDEX.md"), "utf8")
    expect(out).toContain("OK run")
    expect(out).not.toContain("broken-cccc")
  })

  it("is idempotent", async () => {
    writeRun(
      "2026-05-25-idem-eeee",
      {
        runId: "2026-05-25-idem-eeee",
        journey: "Homepage",
        url: "https://example.com",
        overallScore: "6",
        capturedAt: "2026-05-25T12:00:00Z",
      },
      "Idempotent",
    )
    await updateIndex(tmpRoot)
    const first = readFileSync(join(tmpRoot, "INDEX.md"), "utf8")
    await updateIndex(tmpRoot)
    const second = readFileSync(join(tmpRoot, "INDEX.md"), "utf8")
    expect(second).toBe(first)
  })

  it("falls back to runId when frontmatter is malformed", async () => {
    const dir = join(tmpRoot, "2026-05-25-broken-ffff")
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, "report.md"), "no frontmatter at all", "utf8")

    await updateIndex(tmpRoot)
    const out = readFileSync(join(tmpRoot, "INDEX.md"), "utf8")
    expect(out).toContain("_no runs yet_")
  })
})
