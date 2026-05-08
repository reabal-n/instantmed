import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const routeSource = readFileSync(
  join(root, "app/api/employer/verify-bulk/route.ts"),
  "utf8",
)
const helperSource = readFileSync(
  join(root, "lib/verify/public-verification.ts"),
  "utf8",
)
const panelSource = readFileSync(
  join(root, "components/employers/bulk-verification-panel.tsx"),
  "utf8",
)
const employerPageSource = readFileSync(
  join(root, "app/employers/page.tsx"),
  "utf8",
)

describe("employer bulk verification", () => {
  it("reuses the public certificate verification helper instead of forking lookup semantics", () => {
    expect(routeSource).toContain("verifyCertificateCode")
    expect(routeSource).toContain("MAX_BULK_CODES = 25")
    expect(routeSource).toContain('applyRateLimit(')
    expect(helperSource).toContain("ISSUED_CERT_SELECT_FIELDS")
    expect(helperSource).toContain("checkLegacyTables")
  })

  it("keeps employer results privacy-limited", () => {
    expect(panelSource).toContain("No diagnosis shown")
    expect(panelSource).toContain("Masked patient name")
    expect(panelSource).not.toMatch(/dateOfBirth|patientDob|symptoms|clinicalNotes/i)
    expect(routeSource).not.toMatch(/dateOfBirth|patientDob|symptoms|clinicalNotes/i)
  })

  it("publishes a canonical employer hub with the bulk verifier", () => {
    expect(employerPageSource).toContain("Certificate verification for HR teams")
    expect(employerPageSource).toContain("BulkVerificationPanel")
    expect(employerPageSource).toContain('canonical: "https://instantmed.com.au/employers"')
    expect(employerPageSource).not.toContain("Accepted by")
    expect(employerPageSource).not.toContain("Tamper-Proof")
  })
})
