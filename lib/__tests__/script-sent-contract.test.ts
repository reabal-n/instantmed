import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const mutationSource = readFileSync(
  join(process.cwd(), "lib/data/intakes/mutations.ts"),
  "utf8",
)
const queueActionSource = readFileSync(
  join(process.cwd(), "app/doctor/queue/actions.ts"),
  "utf8",
)
const repeatPrescriptionChecklistSource = readFileSync(
  join(process.cwd(), "components/doctor/repeat-prescription-checklist.tsx"),
  "utf8",
)

function functionBody(name: string): string {
  const start = mutationSource.indexOf(`export async function ${name}`)
  expect(start).toBeGreaterThanOrEqual(0)

  const nextExport = mutationSource.indexOf("\nexport async function ", start + 1)
  return mutationSource.slice(start, nextExport === -1 ? mutationSource.length : nextExport)
}

function queueActionBody(name: string): string {
  const start = queueActionSource.indexOf(`export async function ${name}`)
  expect(start).toBeGreaterThanOrEqual(0)

  const nextExport = queueActionSource.indexOf("\nexport async function ", start + 1)
  return queueActionSource.slice(start, nextExport === -1 ? queueActionSource.length : nextExport)
}

describe("script sent mutation production contract", () => {
  it("blocks unaudited script completion reversal in the shared mutation", () => {
    const body = functionBody("updateScriptSent")

    expect(body).toContain("if (!scriptSent)")
    expect(body).toContain("Script sent reversal blocked")
    expect(body.indexOf("if (!scriptSent)")).toBeLessThan(
      body.indexOf(".update({\n      script_sent: scriptSent"),
    )
  })

  it("validates paid prescribing eligibility before writing script completion fields", () => {
    const body = functionBody("updateScriptSent")

    expect(mutationSource).toContain("getParchmentScriptCompletionEligibility")
    expect(body).toContain("getParchmentScriptCompletionEligibility(")
    expect(body).toContain("status, payment_status, category, subtype, script_sent")
    expect(body.indexOf("getParchmentScriptCompletionEligibility(")).toBeLessThan(
      body.indexOf(".update({\n      script_sent: scriptSent"),
    )
  })

  it("keeps the doctor manual completion action on the canonical guarded path", () => {
    const body = queueActionBody("markScriptSentAction")

    expect(body).toContain("isParchmentClaimSatisfied(intake, profile.id)")
    expect(body).toContain("getParchmentScriptCompletionEligibility(")
    expect(body).toContain("updateScriptSent(intakeId, true, scriptNotes, parchmentReference, profile.id)")
    expect(body).toContain("logExternalPrescribingIndicated(")
    expect(body.indexOf("isParchmentClaimSatisfied(intake, profile.id)")).toBeLessThan(
      body.indexOf("updateScriptSent(intakeId, true"),
    )
    expect(body.indexOf("getParchmentScriptCompletionEligibility(")).toBeLessThan(
      body.indexOf("updateScriptSent(intakeId, true"),
    )
  })

  it("retired duplicate legacy script-sent entry points", () => {
    expect(existsSync(join(process.cwd(), "app/api/doctor/script-sent/route.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "app/actions/repeat-prescription.ts"))).toBe(false)
  })

  it("renders the repeat prescription checklist from canonical script_sent fields", () => {
    expect(repeatPrescriptionChecklistSource).toContain('from "@/app/doctor/queue/actions"')
    expect(repeatPrescriptionChecklistSource).not.toContain("@/app/actions/repeat-prescription")
    expect(repeatPrescriptionChecklistSource).toContain("scriptSentAt")
    expect(repeatPrescriptionChecklistSource).not.toContain("prescriptionSentAt")
  })
})
