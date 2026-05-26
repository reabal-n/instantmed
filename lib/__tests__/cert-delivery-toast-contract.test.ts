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
    expect(executeCertApprovalSource).toMatch(/emailSentTo:\s*emailResult\.success\s*\?\s*patient\.email/)
  })
})
