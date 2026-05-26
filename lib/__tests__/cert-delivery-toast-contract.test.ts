import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const reviewActionsSource = readFileSync(
  resolve(process.cwd(), "components/doctor/review-actions.tsx"),
  "utf-8",
)

const documentActionsSource = readFileSync(
  resolve(process.cwd(), "app/doctor/intakes/[id]/document/actions.ts"),
  "utf-8",
)

const executeCertApprovalSource = readFileSync(
  resolve(process.cwd(), "lib/clinical/execute-cert-approval.ts"),
  "utf-8",
)

describe("Cert delivery toast contract", () => {
  it("fires a toast.success that includes the patient email after a successful med cert approval", () => {
    expect(reviewActionsSource).toMatch(/toast\.success\(/)
    expect(reviewActionsSource).toMatch(/Certificate sent to \$\{result\.emailSentTo\}/)
  })

  it("approveWithPreviewDataAction surfaces emailSentTo so the caller can render it in the toast", () => {
    expect(documentActionsSource).toMatch(/emailSentTo\?:\s*string/)
    expect(documentActionsSource).toMatch(/emailSentTo:\s*result\.emailSentTo/)
  })

  it("executeCertApproval populates emailSentTo from the patient profile on a successful send", () => {
    expect(executeCertApprovalSource).toMatch(/emailSentTo\?:\s*string/)
    // After the 30s undo window landed (2026-05-26), emailSentTo is only set
    // for sends that actually fired, not for deferred sends still sitting in
    // the outbox queue. The ternary now guards on `!emailScheduledFor` too.
    expect(executeCertApprovalSource).toMatch(
      /emailSentTo:\s*emailResult\.success\s*&&\s*!emailScheduledFor\s*\?\s*patient\.email/
    )
  })

  it("executeCertApproval surfaces emailScheduledFor so the caller can render the Undo countdown toast", () => {
    expect(executeCertApprovalSource).toMatch(/emailScheduledFor\?:\s*string/)
    expect(executeCertApprovalSource).toMatch(/CERT_APPROVAL_UNDO_WINDOW_SECONDS/)
  })

  it("review-actions shows the Undo countdown toast when emailStatus is scheduled", () => {
    expect(reviewActionsSource).toMatch(/showCertApprovalUndoToast/)
    expect(reviewActionsSource).toMatch(/emailStatus === "scheduled"/)
  })
})
