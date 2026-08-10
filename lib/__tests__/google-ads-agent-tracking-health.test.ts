import { describe, expect, it } from "vitest"

import {
  classifyTrackingHealth,
  type TrackingHealthInput,
} from "@/lib/ads-agent/tracking-health"

const greenFixture: TrackingHealthInput = {
  accountStateReadable: true,
  autoTaggingEnabled: true,
  browserOrGa4PurchasePrimary: false,
  conversionLagImmature: false,
  criticalInputsFresh: true,
  criticalQueriesOk: true,
  enabledCampaignCount: 1,
  evidenceAsOf: "2026-07-27T23:00:00.000Z",
  googleDiagnosticsLagging: false,
  localPaidOrders: 12,
  primaryPurchaseActionOk: true,
  productionUploadWindowElapsed: true,
  productionUploadsHealthy: true,
  purchasePreflightOk: true,
  requiredFinalUrlSuffixPresent: true,
  spendAvailable: true,
  stripeFeesComplete: true,
  terminalClickAttributedAdjustmentFailures: 0,
  uploadAuditHealthy: true,
}

describe("Google Ads Agent tracking health", () => {
  it("allows scaling only when every critical tracking input is GREEN", () => {
    expect(classifyTrackingHealth(greenFixture)).toEqual({
      evidenceAsOf: greenFixture.evidenceAsOf,
      reasonCodes: [],
      scaleAllowed: true,
      state: "GREEN",
    })
  })

  it.each([
    ["STRIPE_FEES_UNAVAILABLE", { stripeFeesComplete: false }],
    ["PRIMARY_PURCHASE_ACTION_INVALID", { primaryPurchaseActionOk: false }],
    ["BROWSER_PURCHASE_ACTION_PRIMARY", { browserOrGa4PurchasePrimary: true }],
    ["PURCHASE_UPLOAD_PREFLIGHT_FAILED", { purchasePreflightOk: false }],
    ["CRITICAL_INPUT_STALE", { criticalInputsFresh: false }],
    ["CRITICAL_QUERY_FAILED", { criticalQueriesOk: false }],
    ["AUTO_TAGGING_DISABLED", { autoTaggingEnabled: false }],
    ["FINAL_URL_SUFFIX_MISSING", { requiredFinalUrlSuffixPresent: false }],
    ["UPLOAD_AUDIT_UNHEALTHY", { uploadAuditHealthy: false }],
    [
      "TERMINAL_CLICK_ADJUSTMENT_FAILURE",
      { terminalClickAttributedAdjustmentFailures: 1 },
    ],
  ] satisfies Array<[string, Partial<TrackingHealthInput>]>)(
    "classifies %s as RED",
    (reasonCode, override) => {
      expect(classifyTrackingHealth({ ...greenFixture, ...override })).toMatchObject({
        reasonCodes: [reasonCode],
        scaleAllowed: false,
        state: "RED",
      })
    },
  )

  it("fails closed when spend is unavailable for an enabled campaign", () => {
    expect(classifyTrackingHealth({
      ...greenFixture,
      spendAvailable: false,
    })).toMatchObject({
      reasonCodes: ["ENABLED_CAMPAIGN_SPEND_UNAVAILABLE"],
      state: "RED",
    })

    expect(classifyTrackingHealth({
      ...greenFixture,
      enabledCampaignCount: 0,
      spendAvailable: false,
    })).toMatchObject({
      reasonCodes: [],
      state: "GREEN",
    })
  })

  it("fails closed when paid orders age past the upload window without a production receipt", () => {
    expect(classifyTrackingHealth({
      ...greenFixture,
      productionUploadsHealthy: false,
    })).toMatchObject({
      reasonCodes: ["PRODUCTION_UPLOADS_MISSING"],
      state: "RED",
    })

    expect(classifyTrackingHealth({
      ...greenFixture,
      localPaidOrders: 0,
      productionUploadsHealthy: false,
    })).toMatchObject({
      reasonCodes: [],
      state: "GREEN",
    })
  })

  it.each([
    ["GOOGLE_DIAGNOSTICS_LAGGING", { googleDiagnosticsLagging: true }],
    ["CONVERSION_LAG_IMMATURE", { conversionLagImmature: true }],
  ] satisfies Array<[string, Partial<TrackingHealthInput>]>)(
    "classifies %s as AMBER and blocks scaling",
    (reasonCode, override) => {
      expect(classifyTrackingHealth({
        ...greenFixture,
        productionUploadsHealthy: true,
        ...override,
      })).toMatchObject({
        reasonCodes: [reasonCode],
        scaleAllowed: false,
        state: "AMBER",
      })
    },
  )

  it("keeps reason codes in deterministic safety order and lets RED outrank AMBER", () => {
    expect(classifyTrackingHealth({
      ...greenFixture,
      criticalQueriesOk: false,
      googleDiagnosticsLagging: true,
      primaryPurchaseActionOk: false,
      stripeFeesComplete: false,
    })).toEqual({
      evidenceAsOf: greenFixture.evidenceAsOf,
      reasonCodes: [
        "CRITICAL_QUERY_FAILED",
        "PRIMARY_PURCHASE_ACTION_INVALID",
        "STRIPE_FEES_UNAVAILABLE",
        "GOOGLE_DIAGNOSTICS_LAGGING",
      ],
      scaleAllowed: false,
      state: "RED",
    })
  })

  it("reports an unreadable account state once instead of fabricating three account diagnoses", () => {
    // 2026-07-31 regression: one ADMIN-only audit query (customer_user_access,
    // added by #421) rejected the whole account-state read, and the classifier
    // reported AUTO_TAGGING_DISABLED + FINAL_URL_SUFFIX_MISSING +
    // PRIMARY_PURCHASE_ACTION_INVALID. All three were false — auto-tagging was
    // enabled and the suffix was fully present throughout the outage.
    const health = classifyTrackingHealth({
      ...greenFixture,
      accountStateReadable: false,
      autoTaggingEnabled: false,
      criticalInputsFresh: false,
      criticalQueriesOk: false,
      primaryPurchaseActionOk: false,
      requiredFinalUrlSuffixPresent: false,
    })

    expect(health.state).toBe("RED")
    expect(health.scaleAllowed).toBe(false)
    expect(health.reasonCodes).toEqual([
      "CRITICAL_INPUT_STALE",
      "CRITICAL_QUERY_FAILED",
      "ACCOUNT_STATE_UNREADABLE",
    ])
    expect(health.reasonCodes).not.toContain("AUTO_TAGGING_DISABLED")
    expect(health.reasonCodes).not.toContain("FINAL_URL_SUFFIX_MISSING")
    expect(health.reasonCodes).not.toContain("PRIMARY_PURCHASE_ACTION_INVALID")
  })

  it("still asserts genuine account faults when the account state was read", () => {
    const health = classifyTrackingHealth({
      ...greenFixture,
      autoTaggingEnabled: false,
      requiredFinalUrlSuffixPresent: false,
    })

    expect(health.reasonCodes).toEqual([
      "AUTO_TAGGING_DISABLED",
      "FINAL_URL_SUFFIX_MISSING",
    ])
    expect(health.reasonCodes).not.toContain("ACCOUNT_STATE_UNREADABLE")
  })

})
