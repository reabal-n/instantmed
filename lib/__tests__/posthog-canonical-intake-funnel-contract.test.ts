import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const source = readFileSync(
  join(process.cwd(), "lib/analytics/posthog-canonical-intake-funnel.ts"),
  "utf8",
)

describe("PostHog canonical intake funnel contract", () => {
  it("uses flow_instance_id only and never coalesces fallback identities", () => {
    expect(source).toContain("properties.flow_instance_id")
    expect(source).not.toContain("properties.$session_id")
    expect(source).not.toContain("distinct_id")
    expect(source).not.toMatch(/uniq\s*\(\s*coalesce/)
  })

  it("anchors the cohort 24 hours behind now and keeps direct reads bounded", () => {
    expect(source).toContain("COHORT_OBSERVATION_HOURS = 24")
    expect(source).toContain("POSTHOG_QUERY_TIMEOUT_MS")
    expect(source).toContain('cache: "no-store"')
    expect(source).toContain("AbortSignal.timeout")
  })

  it("requires ordered timestamps and reads stage coverage separately", () => {
    expect(source).toContain("minIf(timestamp, event = 'intake_started')")
    expect(source).toContain("minIf(timestamp, event = 'checkout_viewed')")
    expect(source).toContain("countIf(notEmpty(toString(properties.flow_instance_id)))")
  })

  it("reads recent coverage separately so historical debt is not presented as current breakage", () => {
    expect(source).toContain("RECENT_COVERAGE_DAYS = 7")
    expect(source).toContain("InstantMed flow ID coverage recent")
    expect(source).toContain("recentCoveragePercent")
  })
})
