import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const lighthouseConfig = JSON.parse(
  readFileSync(join(process.cwd(), "lighthouserc.json"), "utf8"),
)

describe("lighthouse CI contract", () => {
  it("keeps simulated LCP warning-only while hard-gating stable core web vitals", () => {
    const assertions = lighthouseConfig.ci.assert.assertions

    expect(assertions["largest-contentful-paint"][0]).toBe("warn")
    expect(assertions["first-contentful-paint"][0]).toBe("error")
    expect(assertions["total-blocking-time"][0]).toBe("error")
    expect(assertions["cumulative-layout-shift"][0]).toBe("error")
  })
})
