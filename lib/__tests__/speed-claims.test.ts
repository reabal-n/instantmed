import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  buildMedCertSpeedClaim,
  buildMedCertSpeedClaimFromWaitState,
  canShowUnderHourMedCertClaim,
} from "@/lib/marketing/speed-claims"

const waitCounterSource = readFileSync(join(process.cwd(), "lib/brand/wait-counter.ts"), "utf8")

describe("med-cert speed claim contract", () => {
  it("uses database intake-status enum names for live queue metrics", () => {
    expect(waitCounterSource).toContain("\"pending_info\"")
    expect(waitCounterSource).not.toContain("\"needs_more_info\"")
  })

  it("keeps the under-hour moat only when recent med-cert metrics are green", () => {
    const claim = buildMedCertSpeedClaim({
      service: "med-cert",
      medianMinutes: 44,
      sampleSize: 12,
      newestSampleAgeMinutes: 30,
      queueP95Minutes: 55,
    })

    expect(canShowUnderHourMedCertClaim(claim)).toBe(true)
    expect(claim.primary).toContain("often under an hour")
    expect(claim.qualifier).toContain("not a guarantee")
  })

  it("falls back to fast review copy when speed data is stale or queue pressure is high", () => {
    const claim = buildMedCertSpeedClaim({
      service: "med-cert",
      medianMinutes: 44,
      sampleSize: 12,
      newestSampleAgeMinutes: 180,
      queueP95Minutes: 130,
    })

    expect(canShowUnderHourMedCertClaim(claim)).toBe(false)
    expect(claim.primary).toBe("Fast doctor review")
    expect(claim.qualifier).toContain("queue volume")
  })

  it("does not infer under-hour speed from live wait state without freshness evidence", () => {
    const claim = buildMedCertSpeedClaimFromWaitState({
      variant: "live",
      service: "med-cert",
      medianMinutes: 44,
    })

    expect(canShowUnderHourMedCertClaim(claim)).toBe(false)
    expect(claim.primary).toBe("Fast doctor review")
  })

  it("never exposes an under-hour claim for prescribing or consult pathways", () => {
    for (const service of ["rx", "consult"] as const) {
      const claim = buildMedCertSpeedClaim({
        service,
        medianMinutes: 20,
        sampleSize: 50,
        newestSampleAgeMinutes: 5,
        queueP95Minutes: 20,
      })

      expect(canShowUnderHourMedCertClaim(claim)).toBe(false)
      expect(`${claim.primary} ${claim.qualifier}`).not.toMatch(/under an hour/i)
    }
  })
})
