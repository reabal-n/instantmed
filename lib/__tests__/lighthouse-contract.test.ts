import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const lighthouseConfig = JSON.parse(
  readFileSync(join(process.cwd(), "lighthouserc.json"), "utf8"),
)
const requestLighthouseConfig = JSON.parse(
  readFileSync(join(process.cwd(), "lighthouserc.request.json"), "utf8"),
)

describe("lighthouse CI contract", () => {
  it("keeps simulated LCP warning-only while hard-gating stable core web vitals", () => {
    const collect = lighthouseConfig.ci.collect
    const assertions = lighthouseConfig.ci.assert.assertions

    expect(collect.settings.preset).toBe("desktop")
    expect(assertions["largest-contentful-paint"][0]).toBe("warn")
    expect(assertions["first-contentful-paint"][0]).toBe("error")
    expect(assertions["total-blocking-time"][0]).toBe("warn")
    expect(assertions["cumulative-layout-shift"][0]).toBe("error")
  })

  it("keeps mobile intake hard gates focused on stable paid-intake metrics", () => {
    const collect = requestLighthouseConfig.ci.collect
    const assertions = requestLighthouseConfig.ci.assert.assertions

    expect(collect.url).toContain("http://localhost:3000/request")
    expect(collect.url).toContain("http://localhost:3000/request?service=med-cert&duration=1_day")
    expect(collect.settings.formFactor).toBe("mobile")
    expect(assertions["categories:performance"][0]).toBe("warn")
    expect(assertions["categories:performance"][1].minScore).toBe(0.85)
    expect(assertions["first-contentful-paint"]).toEqual([
      "error",
      { maxNumericValue: 2000 },
    ])
    expect(assertions["total-blocking-time"]).toEqual([
      "error",
      { maxNumericValue: 300 },
    ])
    expect(assertions["cumulative-layout-shift"]).toEqual([
      "error",
      { maxNumericValue: 0.05 },
    ])
    expect(assertions["largest-contentful-paint"][0]).toBe("warn")
  })
})
