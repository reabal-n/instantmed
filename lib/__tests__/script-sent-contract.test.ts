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
const parchmentLaunchSource = readFileSync(
  join(process.cwd(), "app/actions/manual-patient.ts"),
  "utf8",
)
const parchmentActionSource = readFileSync(
  join(process.cwd(), "app/actions/parchment.ts"),
  "utf8",
)
const parchmentWebhookSource = readFileSync(
  join(process.cwd(), "app/api/webhooks/parchment/route.ts"),
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

  it("keeps the shared prescribing mutations fail-closed on repeat-Rx attestation", () => {
    const transitionBody = functionBody("updateIntakeStatus")
    const startBody = functionBody("startParchmentPrescribing")
    const recordBody = functionBody("updateScriptSent")

    expect(mutationSource).toContain("getRepeatRxPrescribingBlocker")
    for (const body of [transitionBody, startBody, recordBody]) {
      expect(body).toContain("isRepeatRxIntake(")
      expect(body).toContain("getRepeatRxPrescribingBlocker(")
    }
    expect(transitionBody).toContain('status === "awaiting_script"')
    expect(recordBody.indexOf("intake.script_sent === true")).toBeLessThan(
      recordBody.indexOf("getRepeatRxPrescribingBlocker("),
    )
    expect(recordBody.indexOf("getRepeatRxPrescribingBlocker(")).toBeLessThan(
      recordBody.indexOf("script_sent: scriptSent"),
    )
    expect(recordBody).toContain("options.externalEvidenceAlreadyIssued")
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
    expect(body).toContain('code: "PRESCRIPTION_REQUIRES_SCRIPT_EVIDENCE"')
    expect(body).toContain("Complete or record the prescription in Parchment first.")
    expect(body).not.toContain("updateScriptSent(")
    expect(body).toContain("doctorCanReviewService(profile, serviceType, subtype)")
    expect(body).toContain("Doctor lacks capability to approve prescription")
    expect(body).toContain("ensureClinicalDecisionNoteForApproval(intakeId, {")
    expect(body).toContain("requireExistingNote: Boolean(regimenBlocker)")
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

  // Plan 05 (2026-06-26): a FAILED — or successful — Parchment launch/sync must
  // never mark the script sent. Only the deliberate, evidence/eligibility-gated
  // doctor completion (approvePrescribedScriptAction / markScriptSentAction) or
  // the prescription.created webhook may set script_sent. The attestation path
  // (kept, not deleted) stays the canonical completion route.
  it("never records script_sent from a Parchment launch, sync, create, or refresh action", () => {
    expect(parchmentLaunchSource).not.toMatch(/updateScriptSent|markScriptSent|script_sent/)
  })

  // The PRIMARY Parchment launch surface is app/actions/parchment.ts
  // (getParchmentPrescribeUrlAction + patient sync/retry). Opening Parchment or
  // (re)syncing the patient must never mark the script sent — only the deliberate
  // doctor completion or the prescription.created webhook may.
  it("never records script_sent from the primary Parchment launch action", () => {
    // Reading script_sent is required to suppress duplicate prescribing; this
    // action must still never call a completion mutator or write the field.
    expect(parchmentActionSource).not.toMatch(/updateScriptSent|markScriptSent/)
    expect(parchmentActionSource).not.toMatch(/\.update\([\s\S]{0,160}script_sent/)
  })

  it("records script_sent from the webhook only on an eligible prescription.created event", () => {
    expect(parchmentWebhookSource).toContain('payload.event_type !== "prescription.created"')
    expect(parchmentWebhookSource).toContain("updateScriptSent")
    expect(parchmentWebhookSource).toContain('.eq("status", "awaiting_script")')
    expect(parchmentWebhookSource).toContain('.eq("payment_status", "paid")')
    expect(parchmentWebhookSource).toContain('.eq("script_sent", false)')
    expect(parchmentWebhookSource).toContain("externalEvidenceAlreadyIssued: true")
  })
})

/**
 * 2026-07-19: the manual "Mark Sent Manually" fallback recorded external
 * prescribing evidence and told the patient nothing. Three patients (26 May,
 * 28 May, 31 May 2026) paid, had a real script written, and heard nothing from
 * us — one received no InstantMed email at all.
 *
 * The webhook path stays silent on purpose: it fires on a machine event, so the
 * notification waits for the doctor's explicit approval. The manual path is the
 * doctor's own click after prescribing externally, and no second automated
 * event is coming, so it must notify.
 */
describe("manual script-sent patient notification", () => {
  it("notifies the patient when the doctor records an external script", () => {
    const body = queueActionBody("markScriptSentAction")

    expect(body).toContain("sendScriptSentEmailIfNeeded")
    // Evidence is already durable at this point; an email outage must not
    // discard it by failing the action.
    expect(body).toMatch(/try\s*{[\s\S]*sendScriptSentEmailIfNeeded[\s\S]*catch/)
    expect(body).toContain("emailNotification")
  })

  it("keeps the send idempotent so approval cannot double-notify", () => {
    const helperStart = queueActionSource.indexOf(
      "async function sendScriptSentEmailIfNeeded",
    )
    expect(helperStart).toBeGreaterThanOrEqual(0)
    const helper = queueActionSource.slice(helperStart, helperStart + 1200)

    // Both the manual mark and a later approval call this helper; the outbox
    // lookup is the only thing stopping the patient getting two emails.
    expect(helper).toContain('.eq("email_type", "script_sent")')
    expect(helper).toContain("already_sent")
  })

  it("leaves the webhook path notifying only via explicit approval", () => {
    // Guards the two-step prescribing workflow: a machine event must not email
    // the patient before a doctor has confirmed.
    expect(parchmentWebhookSource).not.toContain("sendScriptSentEmailIfNeeded")
  })
})
