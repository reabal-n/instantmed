import { describe, expect, it } from "vitest"

import {
  classifyTrackingHealth,
  type TrackingHealthInput,
} from "@/lib/ads-agent/tracking-health"

const greenFixture: TrackingHealthInput = {
  autoTaggingEnabled: true,
  browserOrGa4PurchasePrimary: false,
  conversionLagImmature: false,
  criticalInputsFresh: true,
  criticalQueriesOk: true,
  enabledCampaignCount: 1,
  evidenceAsOf: "2026-07-27T23:00:00.000Z",
  googleDiagnosticsLagging: false,
  localPaidOrders: 12,
  optionalAccountQueryFailed: false,
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
    ["OPTIONAL_ACCOUNT_QUERY_FAILED", { optionalAccountQueryFailed: true }],
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
})
