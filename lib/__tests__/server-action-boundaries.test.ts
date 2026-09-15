import { execFileSync, spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

const internalModules = [
  "lib/data/email-outbox.ts", "lib/data/reconciliation.ts", "lib/data/intake-ops.ts", "lib/data/intake-events.ts",
  "lib/email/send/reconstruct.ts", "lib/email/send/outbox.ts", "lib/email/resend.ts", "lib/email/senders.ts",
  "lib/email/abandoned-checkout.ts", "lib/email/partial-intake-recovery.ts", "lib/notifications/service.ts",
  "app/actions/drafts/audit-log.ts", "app/actions/drafts/clinical-note-sync.ts",
  "app/actions/drafts/generate-clinical-note.ts", "app/actions/drafts/generate-consult.ts",
  "app/actions/drafts/generate-med-cert.ts", "app/actions/drafts/generate-repeat-rx.ts",
  "app/actions/generate-drafts.ts", "lib/data/intake-answer-hash.ts",
]
const directories: string[] = []
afterEach(() => { directories.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })) })
function check(manifest: unknown, summary = false) {
  const dir = mkdtempSync(path.join(tmpdir(), "action-boundary-"))
  directories.push(dir)
  const file = path.join(dir, "manifest.json")
  writeFileSync(file, JSON.stringify(manifest))
  return spawnSync(process.execPath, ["scripts/check-server-action-boundaries.mjs", file, ...(summary ? ["--summary"] : [])], { encoding: "utf8" })
}
function action(filename = "app/actions/drafts/draft-validation.ts", exportedName = "checkDraftStaleness") {
  return { filename, exportedName, workers: { "app/doctor/intakes/[id]/page": { moduleId: "private-module", async: false } }, layer: {} }
}

describe("internal server action boundaries", () => {
  it.each(internalModules)("keeps %s server-only with no action directive", filename => {
    const source = readFileSync(filename, "utf8")
    expect(source).toMatch(/import ["']server-only["']/)
    expect(source).not.toMatch(/^[\s]*["']use server["']/m)
  })
  it.each(["node", "edge"])("rejects internal exports in the %s emitted action map", runtime => {
    const result = check({ node: {}, edge: {}, [runtime]: { "private-action-token": action("lib/data/email-outbox.ts", "getEmailOutboxList") }, encryptionKey: "private-encryption-key" })
    expect(result.status).toBe(1)
    expect(result.stdout).toContain("getEmailOutboxList")
    expect(result.stdout).toContain("lib/data/email-outbox.ts")
    expect(result.stdout + result.stderr).not.toMatch(/private-action-token|private-encryption-key|private-module/)
  })
  it("rejects the hash even if re-exported from the previous mixed module", () => {
    expect(check({ node: { secret: action("app/actions/drafts/draft-validation.ts", "computeIntakeHash") }, edge: {} }).status).toBe(1)
  })
  it("accepts deliberate actions and reports only classification metadata", () => {
    const result = check({ node: { "private-action-token": action() }, edge: {}, encryptionKey: "private-encryption-key" })
    expect(result.status).toBe(0)
    expect(JSON.parse(result.stdout)).toMatchObject({ passed: true, actions: [{ runtime: "node", filename: "app/actions/drafts/draft-validation.ts", exportedName: "checkDraftStaleness", workers: ["page"], internal: false }] })
    expect(result.stdout).not.toContain("private-")
  })
  it.each([{}, { node: {}, edge: {} }, { node: { secret: {} }, edge: {} }, { node: [], edge: {} }])("fails closed on missing or unclassifiable manifest metadata", manifest => {
    expect(check(manifest).status).toBe(1)
  })
  it("summarizes passing inventory without listing every action", () => {
    const result = check({ node: { secret: action() }, edge: {} }, true)
    expect(result.status).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({ passed: true, counts: { node: 1, edge: 0, internal: 0 }, violations: [] })
  })
  it("retains failing classification in summary output", () => {
    const result = check({ node: { secret: action("lib/data/email-outbox.ts", "getEmailOutboxList") }, edge: {} }, true)
    expect(result.status).toBe(1)
    expect(JSON.parse(result.stdout)).toMatchObject({ passed: false, counts: { node: 1, edge: 0, internal: 1 }, violations: [{ filename: "lib/data/email-outbox.ts", exportedName: "getEmailOutboxList" }] })
  })
  it("fails closed on missing manifest without disclosing the path", () => {
    expect(() => execFileSync(process.execPath, ["scripts/check-server-action-boundaries.mjs", "/missing/private-manifest"], { stdio: "pipe" })).toThrow()
  })
})
