import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const previewSmokeSource = readFileSync(
  join(process.cwd(), "e2e/preview-smoke.spec.ts"),
  "utf8",
)

describe("preview smoke contract", () => {
  it("requires preview deployments to block the E2E test login route", () => {
    expect(previewSmokeSource).toContain(
      "Vercel preview deployments must always block /api/test/login",
    )
    expect(previewSmokeSource).toContain(".toBe(410)")
    expect(previewSmokeSource).not.toContain('"X-E2E-SECRET"')
    expect(previewSmokeSource).not.toContain("E2E_SECRET not configured")
  })
})
