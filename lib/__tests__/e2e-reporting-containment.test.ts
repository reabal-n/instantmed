import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("E2E reporting containment", () => {
  it("uses deterministic patient links for isolated paid-flow fixtures", () => {
    const autoApproval = read("e2e/medcert.auto-approval.spec.ts")
    const batchReview = read("e2e/medcert.batch-review.spec.ts")

    expect(autoApproval).toContain(
      'const AUTO_APPROVAL_PATIENT_ID = "e2e00000-0000-0000-0000-0000000000a2"',
    )
    expect(autoApproval).not.toContain("const patientId = randomUUID()")
    expect(batchReview).toContain(
      'const BATCH_REVIEW_PATIENT_ID = "e2e00000-0000-0000-0000-0000000000a3"',
    )
    expect(batchReview).not.toContain("const patientId = randomUUID()")
  })

  it("marks direct E2E intake inserts out of reporting", () => {
    for (const path of [
      "e2e/helpers/db.ts",
      "e2e/guest-checkout.spec.ts",
      "e2e/admin.prescribing-identity.spec.ts",
      "e2e/medcert.auto-approval.spec.ts",
    ]) {
      expect(read(path), path).toContain("exclude_from_reporting: true")
    }
  })
})
