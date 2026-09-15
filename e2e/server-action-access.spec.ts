import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"

import { expect, test } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"

// This is a compiled, direct-action test. No page-render denial counts as a pass.
// Keep action IDs and RSC payloads out of Playwright traces and failure artifacts.
test.use({ trace: "off", video: "off", screenshot: "off" })
test.describe.configure({ mode: "serial" })

const SEEDED = {
  doctor: "e2e00000-0000-0000-0000-000000000003",
  admin: "e2e00000-0000-0000-0000-000000000001",
  support: "e2e00000-0000-0000-0000-000000000004",
  patient: "e2e00000-0000-0000-0000-000000000002",
}
const loopback = new Set(["localhost", "127.0.0.1", "[::1]"])
type ActionEntry = { filename: string; exportedName: string; workers: Record<string, unknown> }
type ActionResult = { success?: boolean; isStale?: boolean; error?: string }

function readActionResult(body: string): unknown {
  const chunks = new Map<string, unknown>()
  for (const line of body.split("\n")) {
    const match = /^([0-9a-f]+):(.*)$/.exec(line)
    if (!match) continue
    try { chunks.set(match[1], JSON.parse(match[2])) } catch { /* RSC metadata is not an action result. */ }
  }
  const root = chunks.get("0") as { a?: unknown } | undefined
  if (typeof root?.a !== "string" || !root.a.startsWith("$@")) throw new Error("Direct action did not return an action result")
  const result = chunks.get(root.a.slice(2))
  if (result === undefined) throw new Error("Direct action result was missing or rejected")
  return result
}

function buildActionCaller(baseURL: string) {
  const manifest = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8")) as { node: Record<string, ActionEntry> }
  return async (exportedName: string, args: unknown[], profileId: string, intakeId: string): Promise<unknown> => {
    const entry = Object.entries(manifest.node).find(([, candidate]) => candidate.exportedName === exportedName && candidate.filename.startsWith("app/actions/"))
    if (!entry) throw new Error(`Compiled action missing: ${exportedName}`)
    const worker = Object.keys(entry[1].workers).find(value => value.endsWith("/page") && !value.includes("["))
      ?? Object.keys(entry[1].workers).find(value => value.endsWith("/page") && value.includes("/intakes/[id]/"))
    if (!worker) throw new Error(`Compiled page worker missing: ${exportedName}`)
    const pathname = worker.replace(/^app/, "").replace(/\/page$/, "").replace("[id]", intakeId) || "/"
    // Empty cookie bypasses only the local test middleware, while auth sees no
    // identity. This exercises anonymous denial INSIDE the compiled action.
    // It is impossible on hosted deployments because E2E bypass is disabled.
    const response = await fetch(new URL(pathname, baseURL), {
      method: "POST", redirect: "manual",
      headers: {
        "next-action": entry[0], "content-type": "text/plain;charset=UTF-8", origin: new URL(baseURL).origin,
        cookie: `__e2e_auth_user_id=${profileId}; __e2e_run_id=action-access`,
      },
      body: JSON.stringify(args),
    })
    if (response.status !== 200 || !response.headers.get("content-type")?.includes("text/x-component")) {
      throw new Error(`Direct ${exportedName} request failed to dispatch (${response.status})`)
    }
    return readActionResult(await response.text())
  }
}

test("compiled action boundaries deny non-clinicians and foreign mutations while preserving clinical reads", async ({ baseURL }) => {
  test.setTimeout(120_000)
  // Never let this security regression probe fall through to the primary DB or
  // a provider: a broken regeneration guard must be harmless in this fixture.
  expect(process.env.PLAYWRIGHT_SERVER_MODE === "production", "Build first and use the production-format test server").toBe(true)
  expect(Boolean(baseURL) && loopback.has(new URL(baseURL!).hostname), "Action access tests require a local app").toBe(true)
  const databaseURL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  expect(Boolean(databaseURL) && loopback.has(new URL(databaseURL).hostname), "Action access tests require disposable local Supabase").toBe(true)
  expect(["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "AI_GATEWAY_API_KEY", "VERCEL_AI_GATEWAY_API_KEY"].every(name => !process.env[name] || process.env[name]!.startsWith("test-")), "Use absent or test-only AI credentials").toBe(true)

  const call = buildActionCaller(baseURL!)
  const withoutPrivilegedIO = async (name: string, args: unknown[], actor: string, id: string) => {
    const before = await (await fetch(`${databaseURL}/metrics`)).json()
    const result = await call(name, args, actor, id)
    const after = await (await fetch(`${databaseURL}/metrics`)).json()
    expect(JSON.stringify(after) === JSON.stringify(before), `${name} denies before intake/draft reads or writes`).toBe(true)
    return result
  }
  const db = createClient(databaseURL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const patientB = randomUUID()
  const restrictedDoctor = randomUUID()
  let intakeId: string | undefined
  const draftId = randomUUID()
  try {
    const profiles = await db.from("profiles").insert([
      { id: patientB, auth_user_id: null, role: "patient", full_name: "Synthetic action patient", email: `e2e-action-${patientB}@test.instantmed.com.au`, onboarding_completed: true, email_verified: true },
      { id: restrictedDoctor, auth_user_id: null, role: "doctor", full_name: "Synthetic restricted doctor", email: `e2e-action-${restrictedDoctor}@test.instantmed.com.au`, onboarding_completed: true, email_verified: true, can_review_med_certs: false },
    ])
    expect(profiles.error === null, "Create only synthetic action profiles").toBe(true)
    intakeId = randomUUID()
    const seeded = await db.from("intakes").insert({ id: intakeId, patient_id: SEEDED.patient, status: "in_review", claimed_by: SEEDED.doctor, reviewing_doctor_id: null, reviewed_by: null, subtype: "work" })
    expect(seeded.error === null, "Create isolated action case").toBe(true)
    const inserted = await db.from("document_drafts").insert({
      id: draftId, intake_id: intakeId, request_id: intakeId, type: "med_cert", subtype: "work",
      data: {}, content: {}, is_ai_generated: true, status: "pending", version: 1,
      created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    })
    expect(inserted.error === null, "Create synthetic draft").toBe(true)

    const unchanged = async () => {
      const draft = await db.from("document_drafts").select("approved_at, rejected_at, version").eq("id", draftId).single()
      expect(draft.error === null && draft.data?.approved_at === null && draft.data?.rejected_at === null && draft.data?.version === 1, "Denied actions leave the draft unchanged").toBe(true)
      const audit = await db.from("ai_audit_log").select("id", { count: "exact", head: true }).eq("intake_id", intakeId!)
      expect(audit.error === null && audit.count === 0, "Denied actions produce no mutation audit").toBe(true)
    }
    const denyMutations = async (actor: string, noPrivilegedReads = false) => {
      for (const [name, args] of [
        ["approveDraft", [draftId]], ["rejectDraft", [draftId, "Synthetic rejection check"]], ["regenerateDrafts", [intakeId]],
      ] as const) {
        const result = await (noPrivilegedReads ? withoutPrivilegedIO : call)(name, [...args], actor, intakeId!) as ActionResult
        expect(result.success === false, `${name} must deny at the action boundary`).toBe(true)
        await unchanged()
      }
    }
    for (const [role, actor] of [["anonymous", ""], ["patient A", SEEDED.patient], ["patient B", patientB], ["support", SEEDED.support]]) {
      await test.step(`${role} is denied inside the action`, async () => {
        const drafts = await withoutPrivilegedIO("getAIDraftsForIntake", [intakeId], actor, intakeId!)
        expect(Array.isArray(drafts) && drafts.length === 0, "No draft data for non-clinicians").toBe(true)
        const stale = await withoutPrivilegedIO("checkDraftStaleness", [draftId], actor, intakeId!) as ActionResult
        expect(stale.isStale === false, "No age fingerprint for non-clinicians").toBe(true)
        await denyMutations(actor, true)
      })
    }
    for (const [claim, label] of [[SEEDED.admin, "another clinician's case"], [null, "unclaimed case"]] as const) {
      const claimed = await db.from("intakes").update({ claimed_by: claim, claimed_at: claim ? new Date().toISOString() : null, reviewing_doctor_id: null }).eq("id", intakeId)
      expect(claimed.error === null).toBe(true)
      await test.step(`doctor may read but cannot mutate ${label}`, async () => {
        const drafts = await call("getAIDraftsForIntake", [intakeId], SEEDED.doctor, intakeId!)
        expect(Array.isArray(drafts) && drafts.length === 1).toBe(true)
        const stale = await call("checkDraftStaleness", [draftId], SEEDED.doctor, intakeId!) as ActionResult
        expect(stale.isStale === true).toBe(true)
        await denyMutations(SEEDED.doctor)
      })
    }
    const restrictedClaim = await db.from("intakes").update({ claimed_by: restrictedDoctor }).eq("id", intakeId)
    expect(restrictedClaim.error === null).toBe(true)
    await denyMutations(restrictedDoctor)

    for (const actor of [SEEDED.admin, restrictedDoctor]) {
      const drafts = await call("getAIDraftsForIntake", [intakeId], actor, intakeId)
      const stale = await call("checkDraftStaleness", [draftId], actor, intakeId) as ActionResult
      expect(Array.isArray(drafts) && drafts.length === 1 && stale.isStale === true, "Clinical read entitlement remains separate from mutation capability").toBe(true)
    }

    for (const [actor, claim, name, field] of [
      [SEEDED.admin, restrictedDoctor, "rejectDraft", "rejected_by"],
      [SEEDED.doctor, SEEDED.doctor, "approveDraft", "approved_by"],
    ] as const) {
      const reset = await db.from("document_drafts").update({ approved_at: null, approved_by: null, rejected_at: null, rejected_by: null }).eq("id", draftId)
      const claimResult = await db.from("intakes").update({ claimed_by: claim }).eq("id", intakeId)
      expect(reset.error === null && claimResult.error === null).toBe(true)
      const result = await call(name, name === "rejectDraft" ? [draftId, "Synthetic rejection check"] : [draftId], actor, intakeId) as ActionResult
      expect(result.success === true, "Permitted draft mutation succeeds").toBe(true)
      const updated = await db.from("document_drafts").select("approved_by, rejected_by").eq("id", draftId).single()
      expect(updated.error === null && updated.data?.[field] === actor, "Actor comes from the authenticated context").toBe(true)
      const audit = await db.from("ai_audit_log").select("actor_id").eq("draft_id", draftId).eq("action", name === "rejectDraft" ? "reject" : "approve").single()
      expect(audit.error === null && audit.data?.actor_id === actor, "Durable audit uses the authenticated actor").toBe(true)
    }
  } finally {
    if (intakeId) {
      for (const [table, column] of [["ai_audit_log", "intake_id"], ["document_drafts", "intake_id"], ["intake_events", "intake_id"], ["intake_answers", "intake_id"], ["intakes", "id"]]) {
        const deleted = await db.from(table).delete().eq(column, intakeId)
        expect(deleted.error === null, "Clean up only this synthetic case").toBe(true)
      }
    }
    const removed = await db.from("profiles").delete().in("id", [patientB, restrictedDoctor])
    expect(removed.error === null, "Clean up only this test's synthetic profiles").toBe(true)
  }
})
