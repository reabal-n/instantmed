import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const source = readFileSync(
  join(process.cwd(), "components/checkout/payment-cancelled-content.tsx"),
  "utf8",
)

describe("payment cancelled missing-information branch", () => {
  it("owns an exact, PHI-free recovery branch before generic checkout recovery", () => {
    const branchIndex = source.indexOf('reason === "more_information_required"')
    const genericResumeIndex = source.indexOf("const resumeHref")

    expect(branchIndex).toBeGreaterThan(-1)
    expect(branchIndex).toBeLessThan(genericResumeIndex)
    expect(source).toContain("We need a little more medical information before payment")
    expect(source).toContain("Start a fresh request")
    expect(source).toContain("Contact support")
  })

  it("does not pass identifiers into the dedicated notice", () => {
    expect(source).toContain("<MoreInformationRequiredNotice />")
    expect(source).not.toContain("<MoreInformationRequiredNotice intakeId=")
    expect(source).not.toContain("<MoreInformationRequiredNotice resumeToken=")
  })
})
