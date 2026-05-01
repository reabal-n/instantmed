import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const previewWorkflowSource = readFileSync(
  join(process.cwd(), ".github/workflows/e2e-preview.yml"),
  "utf8",
)

describe("preview deployment workflow contract", () => {
  it("uses the Vercel automation bypass header for preview readiness checks", () => {
    expect(previewWorkflowSource).toContain("VERCEL_AUTOMATION_BYPASS_SECRET")
    expect(previewWorkflowSource).toContain("x-vercel-protection-bypass")
    expect(previewWorkflowSource).toContain("curl_args+=(-H")
    expect(previewWorkflowSource).toContain("--max-time 10")
    expect(previewWorkflowSource).toContain("got HTTP")
  })
})
