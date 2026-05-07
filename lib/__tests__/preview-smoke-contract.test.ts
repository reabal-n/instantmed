import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const previewSmokeSource = readFileSync(
  join(process.cwd(), "e2e/preview-smoke.spec.ts"),
  "utf8",
)

describe("preview smoke contract", () => {
  it("does not require preview deployments to expose the E2E test login route", () => {
    expect(previewSmokeSource).toContain('response.status() === 410')
    expect(previewSmokeSource).toContain("intentionally blocks /api/test/login")
    expect(previewSmokeSource).toContain('"X-E2E-SECRET"')
    expect(previewSmokeSource).toContain('userType: "patient"')
  })
})
