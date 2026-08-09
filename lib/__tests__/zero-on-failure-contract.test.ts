import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

/**
 * Zero-on-failure sweep (2026-08-08).
 *
 * Principle: a count whose read FAILED renders as unknown/degraded — never as
 * zero. Zero asserts "verified all-clear"; a failed read asserts nothing. On
 * self-hiding or self-calming surfaces (the SystemHealthPill, the refunds
 * board, doctor search), a silent zero hides the fire alarm exactly when the
 * platform is unobservable. Failures must also reach Sentry: the logger
 * forwards ONLY error-level calls that carry an Error object (warn never
 * arrives), so every fallback path here logs at error level.
 */
describe("zero-on-failure honesty contract", () => {
  it("SystemHealthPill never self-hides while degraded and renders unknown surfaces as unknown", () => {
    const source = read("components/operator/system-health-pill.tsx")

    // Hide only when the total is zero AND every read succeeded.
    expect(source).toContain("if (total === 0 && !health.degraded) return null")
    expect(source).not.toContain("if (total === 0) return null")

    // A degraded-only state renders an explicit chip instead of a number.
    expect(source).toContain("health check degraded")

    // Rows for failed reads say "unknown", never "clear".
    expect(source).toContain("count === null")
    expect(source).toContain(">unknown<")

    // The JSON parser must not coerce null (unknown) into 0 (clear).
    expect(source).toContain("normalizeHealth")
    expect(source).toContain("value === null || value === undefined ? null :")
  })

  it("the dashboard's server-side health fallback is UNKNOWN, not the all-zero EMPTY", () => {
    const source = read("app/dashboard/page.tsx")

    expect(source).toContain(
      'results[5].status === "fulfilled" ? results[5].value : UNKNOWN_SYSTEM_HEALTH',
    )
  })

  it("admin layout logs nav-count failures at Sentry-reaching error level instead of a silent catch", () => {
    const source = read("app/admin/layout.tsx")

    expect(source).not.toContain(".catch(() => EMPTY_STAFF_NAV_COUNTS)")
    expect(source).toContain("log.error")
    // The doctor layout set this pattern; the admin layout must match it.
    expect(read("app/doctor/layout.tsx")).toContain("log.error")
  })

  it("staff nav-count sub-query failures report at error level with an Error object", () => {
    const source = read("lib/data/staff-nav-counts.ts")

    expect(source).toContain("log.error")
    expect(source).not.toContain("log.warn")
  })

  it("the refunds page renders failed reads as unavailable, never as a clean board with zero stats", () => {
    const source = read("app/admin/refunds/page.tsx")

    // No silent zero-stats fallback object.
    expect(source).not.toContain("{ eligible: 0, processing: 0, refunded: 0, failed: 0, totalRefunded: 0 }")
    // Stats fall back to null (unavailable), and the board failure is passed down.
    expect(source).toContain('results[1].status === "fulfilled" ? results[1].value : null')
    expect(source).toContain("initialLoadFailed={paymentsLoadFailed}")
    // Rejections reach Sentry.
    expect(source).toContain("log.error")
  })

  it("the refunds client distinguishes 'load failed' from 'no refunds' and 'stats unavailable' from 'no failed refunds'", () => {
    const source = read("app/admin/refunds/refunds-client.tsx")

    // Null stats render an explicit unavailable badge, not the calm all-statuses one.
    expect(source).toContain("stats === null")
    expect(source).toContain("Stats unavailable")

    // A failed board load renders an explicit retry state, not the green
    // "No refunds in this view" all-clear.
    expect(source).toContain('data-refunds-unavailable="true"')
    expect(source).toContain("Refund data failed to load")
    expect(source).toContain("setLoadFailed(true)")
  })

  it("doctor search fails closed with an explicit degraded flag when the patient scope read degrades", () => {
    const source = read("app/api/search/route.ts")

    // The scope call must carry the degraded flag — the ids-only wrapper drops it.
    expect(source).toContain("getDoctorAccessiblePatientScope")
    expect(source).not.toContain("getDoctorAccessiblePatientIds")

    // Degraded scope: no partial search, no silent "no matches" — an explicit
    // degraded response plus a Sentry-reaching error log.
    expect(source).toContain("scope.degraded")
    expect(source).toContain("degraded: true")
    expect(source).toContain("log.error")
  })
})
