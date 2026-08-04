import { describe, expect, it } from "vitest"

import {
  ADS_CONTRIBUTION_THIN_MARGIN,
  type AdsContributionHealth,
  buildAdsContributionAlert,
} from "@/lib/monitoring/ads-contribution-health"

function health(overrides: Partial<AdsContributionHealth> = {}): AdsContributionHealth {
  return {
    reportDate: "2026-08-03",
    orders: 54,
    spendCents: 139_108,
    contributionCents: 11_167,
    contributionMargin: 0.0717,
    unavailable: false,
    ...overrides,
  }
}

describe("buildAdsContributionAlert", () => {
  it("pages critical when paid acquisition is losing money", () => {
    const alert = buildAdsContributionAlert(
      health({ contributionCents: -4_200, contributionMargin: -0.03 }),
    )

    expect(alert?.metric).toBe("ads_contribution_negative")
    expect(alert?.severity).toBe("critical")
    expect(alert?.detail).toContain("-$42.00 contribution")
    expect(alert?.detail).toContain("$1391.08 spend")
    expect(alert?.detail).toContain("54 orders")
    expect(alert?.detail).toContain("2026-08-03")
  })

  it("warns while contribution is still positive but too thin to absorb refunds", () => {
    // The real 2026-08-03 figure: +$111.67 on $1391.08, 7.17% margin. Positive,
    // but one refund week flips it — which is exactly when it is cheap to fix.
    const alert = buildAdsContributionAlert(health({ contributionMargin: 0.0417 }))

    expect(alert?.metric).toBe("ads_contribution_thin")
    expect(alert?.severity).toBe("warning")
    expect(alert?.detail).toContain("4.2% margin")
  })

  it("stays silent on a healthy margin", () => {
    expect(buildAdsContributionAlert(health({ contributionMargin: 0.22 }))).toBeNull()
  })

  it("does not alarm on low spend, where margin is statistical noise", () => {
    // Paging on a $30 spend day would train the operator to ignore this metric.
    expect(buildAdsContributionAlert(
      health({ spendCents: 3_000, contributionCents: -500, contributionMargin: -0.4 }),
    )).toBeNull()
  })

  it("never reports health it could not read", () => {
    // Unavailable must not render as "no alert because everything is fine" —
    // the section wrapper owns surfacing a genuinely broken read.
    expect(buildAdsContributionAlert(health({ unavailable: true }))).toBeNull()
  })

  it("treats a negative contribution as critical even above the thin threshold", () => {
    const alert = buildAdsContributionAlert(
      health({ contributionCents: -1, contributionMargin: ADS_CONTRIBUTION_THIN_MARGIN + 0.5 }),
    )
    expect(alert?.severity).toBe("critical")
  })

  it("carries no campaign, keyword, patient, or intake identifier", () => {
    const alert = buildAdsContributionAlert(
      health({ contributionCents: -9_900, contributionMargin: -0.07 }),
    )
    const serialized = JSON.stringify(alert)
    for (const forbidden of ["campaign", "keyword", "intake", "patient", "gclid", "email"]) {
      expect(serialized.toLowerCase()).not.toContain(forbidden)
    }
  })
})
