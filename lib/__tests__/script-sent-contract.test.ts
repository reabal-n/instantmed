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
      body.indexOf("script_sent: scriptSent"),
    )
  })

  it("validates paid prescribing eligibility before writing script completion fields", () => {
    const body = functionBody("updateScriptSent")

    expect(mutationSource).toContain("getParchmentScriptCompletionEligibility")
    expect(body).toContain("getParchmentScriptCompletionEligibility(")
    expect(body).toContain("status, payment_status, category, subtype, script_sent")
    expect(body).toContain('.eq("status", "awaiting_script")')
    expect(body).toContain('.eq("payment_status", "paid")')
    expect(body).toContain("[updateScriptSent] Script sent update matched no eligible intake")
    expect(body.indexOf("getParchmentScriptCompletionEligibility(")).toBeLessThan(
      body.indexOf("script_sent: scriptSent"),
    )
  })

  it("keeps script recording separate from final prescription approval", () => {
    const recordBody = functionBody("updateScriptSent")
    const approveBody = functionBody("approvePrescribedScript")

    expect(recordBody).not.toContain('status: "completed"')
    expect(recordBody).not.toContain('decision: "approved"')
    expect(approveBody).toContain("intake.script_sent !== true")
    expect(approveBody).toContain("validateIntakeStatusTransition(")
    expect(approveBody).toContain('status: "completed"')
    expect(approveBody).toContain('.eq("status", "awaiting_script")')
    expect(approveBody).toContain('{ source: "approvePrescribedScript" }')
  })

  it("keeps the doctor manual completion action on the canonical guarded path", () => {
    const body = queueActionBody("markScriptSentAction")

    expect(body).toContain("isParchmentClaimSatisfied(intake, profile.id)")
    expect(body).toContain("doctorCanReviewService(profile, serviceType, subtype)")
    expect(body).toContain("Doctor lacks capability to record prescription completion")
    expect(body).toContain("getParchmentPatientIdentityIssues(patient, answers)")
    expect(body).toContain("INCOMPLETE_PRESCRIBING_IDENTITY")
    expect(body).toContain("const evidenceNote = scriptNotes?.trim()")
    expect(body).toContain("const evidenceReference = parchmentReference?.trim()")
    expect(body).toContain("SCRIPT_SENT_EVIDENCE_REQUIRED")
    expect(body).toContain("startParchmentPrescribing(intakeId, profile.id)")
    expect(body).toContain("getParchmentScriptCompletionEligibility(")
    expect(body).toContain("updateScriptSent(intakeId, true, evidenceNote, evidenceReference, profile.id)")
    expect(body).toContain("logExternalPrescribingIndicated(")
    expect(body).not.toContain("sendEmail")
    expect(body.indexOf("isParchmentClaimSatisfied(intake, profile.id)")).toBeLessThan(
      body.indexOf("updateScriptSent(intakeId, true"),
    )
    expect(body.indexOf("getParchmentPatientIdentityIssues(patient, answers)")).toBeLessThan(
      body.indexOf("startParchmentPrescribing(intakeId, profile.id)"),
    )
    expect(body.indexOf("SCRIPT_SENT_EVIDENCE_REQUIRED")).toBeLessThan(
      body.indexOf("updateScriptSent(intakeId, true"),
    )
    expect(body.indexOf("getParchmentScriptCompletionEligibility(")).toBeLessThan(
      body.indexOf("updateScriptSent(intakeId, true"),
    )
  })

  it("blocks direct approval of prescribing services before durable script evidence exists", () => {
    const body = queueActionBody("updateStatusAction")

    expect(body).toContain("isPrescribingServiceRequest(serviceType, subtype)")
    expect(body).toContain("Complete or record the prescription in Parchment before approving.")
    expect(body).toContain("PRESCRIPTION_REQUIRES_SCRIPT_EVIDENCE")
    expect(body.indexOf("PRESCRIPTION_REQUIRES_SCRIPT_EVIDENCE")).toBeLessThan(
      body.indexOf("updateIntakeStatus(intakeId, status, profile.id)"),
    )
  })

  it("keeps patient notification in the separate doctor approval action", () => {
    const body = queueActionBody("approvePrescribedScriptAction")

    expect(body).toContain("approvePrescribedScript(intakeId, profile.id)")
    // Operator policy 2026-06-22: completing a prescribing consult attests the
    // script was prescribed (via updateScriptSent) rather than hard-blocking when
    // the Parchment webhook hasn't confirmed (it never fires in test mode).
    expect(body).toContain("updateScriptSent(")
    expect(body).toContain("confirmed by the reviewing doctor on completion")
    expect(body).toContain("doctorCanReviewService(profile, serviceType, subtype)")
    expect(body).toContain("Doctor lacks capability to approve prescription")
    expect(body).toContain("ensureClinicalDecisionNoteForApproval(intakeId)")
    expect(body).toContain("sendScriptSentEmailIfNeeded(supabase, intakeId)")
    expect(body).toContain("emailNotification")
    expect(body).toContain('emailNotification: "sent"')
    expect(body).toContain('emailNotification = "failed"')
    expect(queueActionSource).toContain("sendEmail")
    expect(queueActionSource).toContain("ScriptSentEmail")
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
